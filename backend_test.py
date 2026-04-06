#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ViralIQAPITester:
    def __init__(self, base_url="https://viral-idea-hub-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_signup(self):
        """Test user signup"""
        timestamp = int(datetime.now().timestamp())
        test_data = {
            "email": f"test_{timestamp}@viraliq.com",
            "password": "TestPass123!",
            "full_name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test("User Signup", "POST", "auth/signup", 200, test_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.test_email = test_data['email']
            self.test_password = test_data['password']
            return True
        return False

    def test_signin(self):
        """Test user signin with existing credentials"""
        test_data = {
            "email": "demo@viraliq.com",
            "password": "Demo123456"
        }
        
        success, response = self.run_test("User Signin", "POST", "auth/signin", 200, test_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_generate_ideas(self):
        """Test viral idea generation"""
        test_data = {
            "niche": "Tech Reviews",
            "target_audience": "Young professionals",
            "language": "English"
        }
        
        success, response = self.run_test("Generate Viral Ideas", "POST", "generate-ideas", 200, test_data)
        
        if success and 'ideas' in response:
            ideas = response['ideas']
            if len(ideas) > 0:
                # Verify idea structure
                idea = ideas[0]
                required_fields = ['title', 'hook', 'thumbnail_concept', 'viral_score', 'best_upload_day', 'best_upload_time']
                for field in required_fields:
                    if field not in idea:
                        self.log_test("Idea Structure Validation", False, f"Missing field: {field}")
                        return False
                self.log_test("Idea Structure Validation", True)
                return True
            else:
                self.log_test("Ideas Count Validation", False, "No ideas returned")
                return False
        return False

    def test_analyze_video(self):
        """Test video analysis"""
        test_data = {
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
        
        success, response = self.run_test("Analyze Video", "POST", "analyze-video", 200, test_data)
        
        if success:
            # Verify analysis structure
            required_fields = ['score', 'reasons', 'improved_title', 'better_thumbnail']
            for field in required_fields:
                if field not in response:
                    self.log_test("Analysis Structure Validation", False, f"Missing field: {field}")
                    return False
            
            # Verify score is between 0-100
            if not (0 <= response['score'] <= 100):
                self.log_test("Score Range Validation", False, f"Score {response['score']} not in range 0-100")
                return False
            
            self.log_test("Analysis Structure Validation", True)
            return True
        return False

    def test_checkout_session(self):
        """Test Stripe checkout session creation"""
        origin_url = "https://viral-idea-hub-2.preview.emergentagent.com"
        
        success, response = self.run_test(
            "Create Checkout Session", 
            "POST", 
            f"checkout/session?plan=pro&origin_url={origin_url}", 
            200
        )
        
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            return True
        return False

    def test_checkout_status(self):
        """Test checkout status retrieval"""
        if hasattr(self, 'session_id'):
            return self.run_test("Get Checkout Status", "GET", f"checkout/status/{self.session_id}", 200)
        else:
            self.log_test("Get Checkout Status", False, "No session_id available")
            return False

    def test_usage_limits(self):
        """Test usage limits enforcement"""
        # Try to generate ideas multiple times to test limits
        test_data = {
            "niche": "Gaming",
            "target_audience": "Teenagers", 
            "language": "English"
        }
        
        # First few should work (free tier allows 3 per week)
        for i in range(4):  # Try 4 times to test limit
            success, response = self.run_test(
                f"Usage Limit Test {i+1}", 
                "POST", 
                "generate-ideas", 
                200 if i < 3 else 403,  # Expect 403 on 4th attempt
                test_data
            )
            
            if i >= 3 and success:
                self.log_test("Usage Limit Enforcement", False, "Should have hit usage limit")
                return False
        
        self.log_test("Usage Limit Enforcement", True)
        return True

    def test_signout(self):
        """Test user signout"""
        return self.run_test("User Signout", "POST", "auth/signout", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ViralIQ API Tests...")
        print(f"Testing against: {self.api_url}")
        print("=" * 50)
        
        # Test sequence
        tests = [
            ("API Root", self.test_root_endpoint),
            ("User Signup", self.test_signup),
            ("Get Current User", self.test_get_me),
            ("Generate Ideas", self.test_generate_ideas),
            ("Analyze Video", self.test_analyze_video),
            ("Create Checkout", self.test_checkout_session),
            ("Checkout Status", self.test_checkout_status),
            ("User Signout", self.test_signout),
            ("Demo User Signin", self.test_signin),
            ("Usage Limits", self.test_usage_limits),
        ]
        
        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name}...")
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Test execution error: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if r['status'] == 'FAILED']
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ViralIQAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())