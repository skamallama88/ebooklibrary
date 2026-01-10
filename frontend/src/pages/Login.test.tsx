import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils'
import userEvent from '@testing-library/user-event'
import LoginPage from './LoginPage'
import * as AuthContext from '../AuthContext'
import api from '../api'

// Mock useAuth
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock api
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('LoginPage Component', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: mockLogin,
      logout: vi.fn(),
      isLoading: false,
    })
  })

  it('renders login form', () => {
    render(<LoginPage />)
    
    expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls login API and context login with correct credentials', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({ data: { access_token: 'test-token' } })
    
    render(<LoginPage />)
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText(/enter your username/i), 'testuser')
    await user.type(screen.getByPlaceholderText(/••••••••/), 'password123')
    
    // Submit
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/token', expect.any(URLSearchParams), expect.any(Object))
      expect(mockLogin).toHaveBeenCalledWith('test-token')
    })
  })

  it('displays error message on failed login', async () => {
    const user = userEvent.setup()
    
    // Mock a failed API call
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } }
    })
    
    render(<LoginPage />)
    
    await user.type(screen.getByPlaceholderText(/enter your username/i), 'wronguser')
    await user.type(screen.getByPlaceholderText(/••••••••/), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
