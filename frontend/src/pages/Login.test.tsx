/**
 * Tests for the Login component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test/utils'
import userEvent from '@testing-library/user-event'
import Login from './Login'

describe('Login Component', () => {
  it('renders login form', () => {
    render(<Login />)
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<Login />)
    
    const submitButton = screen.getByRole('button', { name: /log in/i })
    await user.click(submitButton)
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    })
  })

  it('calls login API with correct credentials', async () => {
    const user = userEvent.setup()
    const mockLogin = vi.fn()
    
    render(<Login onLogin={mockLogin} />)
    
    // Fill in the form
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    // Submit
    await user.click(screen.getByRole('button', { name: /log in/i }))
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      })
    })
  })

  it('displays error message on failed login', async () => {
    const user = userEvent.setup()
    
    // Mock a failed API call
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    
    render(<Login onLogin={mockLogin} />)
    
    await user.type(screen.getByLabelText(/username/i), 'wronguser')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
