# Testing Guide

This document describes how to run tests for the Disease Community Platform.

## Backend Tests

### Prerequisites

1. Ensure PostgreSQL is running (via Docker Compose or locally)
2. Activate the Python virtual environment:
   ```bash
   cd backend
   source venv/bin/activate  # On macOS/Linux
   # or
   .\venv\Scripts\activate  # On Windows
   ```

### Running Tests

Run all backend tests:
```bash
cd backend
pytest
```

Run specific test file:
```bash
pytest tests/api/test_vital_records_api.py
```

Run specific test:
```bash
pytest tests/api/test_vital_records_api.py::TestVitalRecordsAPI::test_get_blood_pressure_records_without_date_range
```

Run with verbose output:
```bash
pytest -v
```

Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

### Test Database

Tests use a separate test database (`disease_community_test`) configured in `backend/tests/conftest.py`. The test database is automatically created and cleaned up for each test session.

## Frontend Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running Tests

Run all frontend tests:
```bash
cd frontend
npm test
```

Run in watch mode:
```bash
npm run test:watch
```

Run with coverage:
```bash
npm run test:coverage
```

### Test Structure

- **Component Tests**: `frontend/components/__tests__/`
  - `VitalCharts.test.tsx`: Tests for chart component including zoom/pan and date range functionality
  - `ErrorDisplay.test.tsx`: Tests for error display component
  - `DiseaseStatusBadge.test.tsx`: Tests for disease status badge component

- **Hook Tests**: `frontend/lib/hooks/__tests__/`
  - `useDataLoader.test.tsx`: Tests for data loading hook including date range parameters

- **Page Tests**: `frontend/app/[locale]/daily/__tests__/`
  - `page.test.tsx`: Tests for daily page including calendar and chart view modes

- **Utility Tests**: `frontend/lib/utils/__tests__/`
  - `tokenManager.test.ts`: Tests for token management
  - `searchHistory.test.ts`: Tests for search history
  - `hashtag.test.ts`: Tests for hashtag utilities
  - `errorHandler.test.ts`: Tests for error handling

## Test Coverage

### Backend

- **API Endpoints**: Tests for all vital record API endpoints with date range filtering
  - Blood Pressure Records
  - Heart Rate Records
  - Temperature Records
  - Weight Records
  - Body Fat Records
  - Blood Glucose Records
  - SpO2 Records

- **Date Range Filtering**: Tests verify that:
  - Records are filtered correctly by start_date and end_date
  - Date ranges are inclusive of start and end dates
  - Pagination works correctly with date range filters

### Frontend

- **Chart Components**: Tests verify that:
  - Charts render correctly with data
  - Date range changes trigger data refresh
  - Zoom/pan events are handled correctly
  - Mobile touch events work correctly

- **Data Loading**: Tests verify that:
  - Data is loaded correctly with date range parameters
  - Calendar view loads all data without date range filter
  - Chart view loads filtered data based on date range

- **View Modes**: Tests verify that:
  - Calendar view displays all records
  - Chart view displays filtered records
  - Switching between views triggers appropriate data loading

## Continuous Integration

Tests are automatically run in CI/CD pipelines:
- Backend tests run on every push to main branch
- Frontend tests run on every push to main branch
- Test failures block deployment

## Troubleshooting

### Backend Tests

**Issue**: `psycopg2.OperationalError: could not connect to server`
- **Solution**: Ensure PostgreSQL is running and accessible at the configured host

**Issue**: `ModuleNotFoundError: No module named 'pytest'`
- **Solution**: Activate the virtual environment and install dependencies:
  ```bash
  cd backend
  source venv/bin/activate
  pip install -r requirements.txt
  ```

### Frontend Tests

**Issue**: `Cannot find module` errors
- **Solution**: Install dependencies:
  ```bash
  cd frontend
  npm install
  ```

**Issue**: Tests fail with `ReferenceError: window is not defined`
- **Solution**: Ensure tests use `jest-environment-jsdom` (configured in `jest.config.js`)

## Writing New Tests

### Backend Test Template

```python
def test_new_feature(self, db_session, test_user):
    """Test description."""
    # Setup
    # ... create test data ...
    
    # Execute
    # ... call API or service ...
    
    # Assert
    # ... verify results ...
```

### Frontend Test Template

```typescript
it('should test new feature', () => {
  // Setup
  const mockFn = jest.fn();
  
  // Execute
  render(<Component onAction={mockFn} />);
  
  // Assert
  expect(mockFn).toHaveBeenCalled();
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Tests should clean up after themselves (handled automatically by fixtures)
3. **Mocking**: Use mocks for external dependencies (Auth0, API calls, etc.)
4. **Coverage**: Aim for high test coverage, especially for critical paths
5. **Naming**: Use descriptive test names that explain what is being tested
6. **Speed**: Keep tests fast by using appropriate fixtures and mocks
