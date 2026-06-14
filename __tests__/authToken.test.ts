import {describe, expect, it} from 'vitest'
import {usernameFromToken} from '../utils/authToken'

// Build an unsigned JWT-shaped string with the given payload (header.payload.sig).
const makeToken = (payload: object): string => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    return `${b64({alg: 'HS256', typ: 'JWT'})}.${b64(payload)}.sig`
}

describe('usernameFromToken', () => {
    it('returns the sub claim from a valid token', () => {
        expect(usernameFromToken(makeToken({sub: 'alice', exp: 1}))).toBe('alice')
    })

    it('returns null for a null/empty token', () => {
        expect(usernameFromToken(null)).toBeNull()
        expect(usernameFromToken('')).toBeNull()
        expect(usernameFromToken(undefined)).toBeNull()
    })

    it('returns null when there is no sub claim', () => {
        expect(usernameFromToken(makeToken({foo: 'bar'}))).toBeNull()
    })

    it('returns null for a malformed token', () => {
        expect(usernameFromToken('not-a-jwt')).toBeNull()
        expect(usernameFromToken('a.b')).toBe(null) // payload "b" is not valid base64 JSON
    })
})
