/**
 * Tests for the Topbar component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import userEvent from '@testing-library/user-event'
import Topbar from './Topbar'

// Mock useAuth
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  })),
}))

const mockProps = {
  selectedBookIds: [],
  onAddBooks: vi.fn(),
  onEditBook: vi.fn(),
  onDownloadBooks: vi.fn(),
  onDeleteBooks: vi.fn(),
  onAddToCollection: vi.fn(),
  onRead: vi.fn(),
  darkMode: false,
  toggleDarkMode: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenUserManagement: vi.fn(),
  onOpenTagManagement: vi.fn(),
  onOpenAIProvider: vi.fn(),
  onOpenAISummary: vi.fn(),
  onOpenAITags: vi.fn(),
}

describe('Topbar Component', () => {
  it('renders add books button', () => {
    render(<Topbar {...mockProps} />)
    
    expect(screen.getByText(/add books/i)).toBeInTheDocument()
  })

  it('shows collect button when books are selected', () => {
    render(<Topbar {...mockProps} selectedBookIds={[1, 2]} />)
    
    expect(screen.getByText(/collect/i)).toBeInTheDocument()
  })

  it('toggles dark mode when clicked', async () => {
    const user = userEvent.setup()
    const toggleDarkMode = vi.fn()
    
    render(<Topbar {...mockProps} toggleDarkMode={toggleDarkMode} />)
    
    // The button title depends on the current mode
    const darkModeButton = screen.getByTitle(/switch to dark mode/i)
    await user.click(darkModeButton)
    
    expect(toggleDarkMode).toHaveBeenCalled()
  })
})
