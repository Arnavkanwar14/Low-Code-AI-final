import unittest
import json
import io
import os
import sys

# Add backend directory to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

class TestIntegration(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        
        # Create a sample CSV for testing
        self.csv_content = "id,value,category,text\n1,10.5,A,hello\n2,20.0,B,world\n3,,A,foo\n4,15.5,C,bar\n5,100.0,B,baz"
        self.csv_file = (io.BytesIO(self.csv_content.encode('utf-8')), 'test.csv')

    def test_health(self):
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')

    def test_clean_data_normalization(self):
        # Create a fresh file object for each request
        file_obj = (io.BytesIO(self.csv_content.encode('utf-8')), 'test.csv')
        
        options = json.dumps({
            'removeMissingValues': True,
            'normalizeData': True
        })
        
        response = self.app.post('/api/clean-data', 
                                 data={'file': file_obj, 'options': options},
                                 content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        
        # Check if steps were recorded
        steps = [s['step'] for s in data['cleaning_steps']]
        self.assertIn('Remove Missing Values', steps)
        self.assertIn('Normalize Data', steps)
        
        # Check stats (row 3 has missing value, so should be removed)
        self.assertEqual(data['final_stats']['rows_removed'], 1)

    def test_train_auto_config(self):
        # Test the training endpoint which uses orchestrator
        file_obj = (io.BytesIO(self.csv_content.encode('utf-8')), 'test.csv')
        
        response = self.app.post('/api/train',
                                 data={'file': file_obj, 'target_column': 'value'},
                                 content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('auto_config', data)
        self.assertIn('feature_map', data)
        
        # 'category' should be categorical, 'text' should be text
        feature_map = data['feature_map']
        self.assertIn('category', feature_map['categorical'])
        self.assertIn('text', feature_map['text'])

if __name__ == '__main__':
    unittest.main()
