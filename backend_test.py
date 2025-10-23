import requests
import sys
import json
from datetime import datetime

class FinancialAppTester:
    def __init__(self, base_url="https://mymoneymanager-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = f"TestUser_{datetime.now().strftime('%H%M%S')}"
        self.tests_run = 0
        self.tests_passed = 0
        self.category_ids = {}
        self.transaction_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "username": self.test_user_name,
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success and response.get('email') == self.test_user_email

    def test_get_categories(self):
        """Test get user categories (should have default categories)"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            # Store category IDs for later use
            for category in response:
                self.category_ids[category['type']] = category['id']
            print(f"   Found {len(response)} default categories")
            return True
        return False

    def test_create_category(self):
        """Test create new category"""
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={
                "name": "Test Category",
                "type": "expense",
                "color": "#ff0000"
            }
        )
        if success and 'id' in response:
            self.category_ids['test_expense'] = response['id']
            return True
        return False

    def test_update_category(self):
        """Test update category"""
        if 'test_expense' not in self.category_ids:
            return False
        
        success, response = self.run_test(
            "Update Category",
            "PUT",
            f"categories/{self.category_ids['test_expense']}",
            200,
            data={
                "name": "Updated Test Category",
                "color": "#00ff00"
            }
        )
        return success and response.get('name') == "Updated Test Category"

    def test_create_transaction(self):
        """Test create transaction"""
        if 'expense' not in self.category_ids:
            return False
            
        success, response = self.run_test(
            "Create Transaction",
            "POST",
            "transactions",
            200,
            data={
                "amount": 100.50,
                "description": "Test Transaction",
                "date": "2025-01-15",
                "category_id": self.category_ids['expense'],
                "type": "expense"
            }
        )
        if success and 'id' in response:
            self.transaction_ids.append(response['id'])
            return True
        return False

    def test_get_transactions(self):
        """Test get user transactions"""
        success, response = self.run_test(
            "Get Transactions",
            "GET",
            "transactions",
            200
        )
        return success and isinstance(response, list)

    def test_update_transaction(self):
        """Test update transaction"""
        if not self.transaction_ids:
            return False
            
        success, response = self.run_test(
            "Update Transaction",
            "PUT",
            f"transactions/{self.transaction_ids[0]}",
            200,
            data={
                "amount": 150.75,
                "description": "Updated Test Transaction"
            }
        )
        return success and response.get('amount') == 150.75

    def test_get_statistics(self):
        """Test get statistics"""
        success, response = self.run_test(
            "Get Statistics",
            "GET",
            "statistics",
            200
        )
        return success and all(key in response for key in ['total_income', 'total_expenses', 'total_savings', 'balance'])

    def test_delete_transaction(self):
        """Test delete transaction"""
        if not self.transaction_ids:
            return False
            
        success, response = self.run_test(
            "Delete Transaction",
            "DELETE",
            f"transactions/{self.transaction_ids[0]}",
            200
        )
        return success

    def test_delete_category(self):
        """Test delete category"""
        if 'test_expense' not in self.category_ids:
            return False
            
        success, response = self.run_test(
            "Delete Category",
            "DELETE",
            f"categories/{self.category_ids['test_expense']}",
            200
        )
        return success

    def test_invalid_token(self):
        """Test API with invalid token"""
        old_token = self.token
        self.token = "invalid_token"
        success, response = self.run_test(
            "Invalid Token Test",
            "GET",
            "auth/me",
            401
        )
        self.token = old_token
        return success

    def test_unauthorized_access(self):
        """Test API without token"""
        old_token = self.token
        self.token = None
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "categories",
            401
        )
        self.token = old_token
        return success

def main():
    print("🚀 Starting Financial App Backend Testing...")
    print("=" * 60)
    
    tester = FinancialAppTester()
    
    # Test sequence
    test_sequence = [
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login),
        ("Get Current User", tester.test_get_current_user),
        ("Get Categories", tester.test_get_categories),
        ("Create Category", tester.test_create_category),
        ("Update Category", tester.test_update_category),
        ("Create Transaction", tester.test_create_transaction),
        ("Get Transactions", tester.test_get_transactions),
        ("Update Transaction", tester.test_update_transaction),
        ("Get Statistics", tester.test_get_statistics),
        ("Delete Transaction", tester.test_delete_transaction),
        ("Delete Category", tester.test_delete_category),
        ("Invalid Token Test", tester.test_invalid_token),
        ("Unauthorized Access Test", tester.test_unauthorized_access),
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())