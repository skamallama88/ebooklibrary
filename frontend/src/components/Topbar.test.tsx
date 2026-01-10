/**
 * Tests for the Topbar component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import userEvent from '@testing-library/user-event'
import Topbar from './Topbar'

describe('Topbar Component', () => {
  it('renders application title', () => {
    render(<Topbar />)
    
    expect(screen.getByText(/ebook library/i)).toBeInTheDocument()
  })

  it('shows user menu when authenticated', () => {
    const mockUser = { username: 'testuser', email: 'test@example.com' }
    
    render(<Topbar user={mockUser} />)
    
    expect(screen.getByText(/testuser/i)).toBeInTheDocument()
  })

  it('shows login button when not authenticated', () => {
    render(<Topbar user={null} />)
    
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('opens user menu on click', async () => {
    const user = userEvent.setup()
    const mockUser = { username: 'testuser', email: 'test@example.com' }
    
    render(<Topbar user={mockUser} />)
    
    // Click user menu button
    const userButton = screen.getByText(/testuser/i)
    await user.click(userButton)
    
    // Should show dropdown options
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
    expect(screen.getByText(/logout/i)).toBeInTheDocument()
  })

  it('calls logout handler when logout clicked', async () => {
    const user = userEvent.setup()
    const mockLogout = vi.fn()
    const mockUser = { username: 'testuser', email: 'test@example.com' }
    
    render(<Topbar user={mockUser} onLogout={mockLogout} />)
    
    await user.click(screen.getByText(/testuser/i))
    await user.click(screen.getByText(/logout/i))
    
    expect(mockLogout).toHaveBeenCalled()
  })
})
