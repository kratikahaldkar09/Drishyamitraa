import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders title', () => {
  render(<App />);
  expect(screen.getByText(/Drishyamitra/i)).toBeInTheDocument();
});

