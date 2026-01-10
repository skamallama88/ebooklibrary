/**
 * API utility tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { login, getBooks } from './api'

// Mock axios
// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    post: vi.fn(),
    get: vi.fn(),
  };
  return { default: mockAxios };
})

describe('API Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('sends login request with credentials', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          token_type: 'bearer'
        }
      }
      
      vi.mocked(axios.post).mockResolvedValue(mockResponse)
      
      const result = await login('testuser', 'password123')
      
      expect(axios.post).toHaveBeenCalledWith('/auth/token', {
        username: 'testuser',
        password: 'password123'
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('throws error on failed login', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Unauthorized'))
      
      await expect(login('baduser', 'badpass')).rejects.toThrow('Unauthorized')
    })
  })

  describe('getBooks', () => {
    it('fetches books with auth token', async () => {
      const mockBooks = {
        data: {
          items: [
            { id: 1, title: 'Book 1' },
            { id: 2, title: 'Book 2' }
          ],
          total: 2
        }
      }
      
      vi.mocked(axios.get).mockResolvedValue(mockBooks)
      
      const result = await getBooks('mock-token')
      
      expect(axios.get).toHaveBeenCalledWith('/books/', {
        headers: { Authorization: 'Bearer mock-token' }
      })
      expect(result).toEqual(mockBooks.data)
    })

    it('handles API errors gracefully', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'))
      
      await expect(getBooks('mock-token')).rejects.toThrow('Network error')
    })
  })
})
