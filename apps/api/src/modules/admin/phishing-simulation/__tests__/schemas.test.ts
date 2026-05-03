import { describe, expect, it } from 'vitest';

import { senderContactSchema, subjectSchema } from '../schemas.js';

describe('phishing-simulation-schemas', () => {
  describe('senderContactSchema', () => {
    it('should accept valid sender contact input', () => {
      const input = {
        senderName: 'Test Sender',
        senderEmail: 'sender@example.com',
        replyTo: 'replyto@example.com',
      };
      expect(() => senderContactSchema.parse(input)).not.toThrow();
    });

    it('should accept empty object', () => {
      expect(() => senderContactSchema.parse({})).not.toThrow();
    });

    it('should accept only senderName', () => {
      const input = { senderName: 'Test Sender' };
      expect(() => senderContactSchema.parse(input)).not.toThrow();
    });

    it('should accept only senderEmail', () => {
      const input = { senderEmail: 'sender@example.com' };
      expect(() => senderContactSchema.parse(input)).not.toThrow();
    });

    it('should accept only replyTo', () => {
      const input = { replyTo: 'replyto@example.com' };
      expect(() => senderContactSchema.parse(input)).not.toThrow();
    });

    it('should accept senderName and senderEmail without replyTo', () => {
      const input = {
        senderName: 'Test Sender',
        senderEmail: 'sender@example.com',
      };
      expect(() => senderContactSchema.parse(input)).not.toThrow();
    });

    it('should reject invalid senderEmail format', () => {
      const input = { senderEmail: 'not-an-email' };
      expect(() => senderContactSchema.parse(input)).toThrow();
    });

    it('should reject invalid replyTo email format', () => {
      const input = { replyTo: 'not-an-email' };
      expect(() => senderContactSchema.parse(input)).toThrow();
    });

    it('should reject senderName exceeding max length', () => {
      const input = { senderName: 'a'.repeat(256) };
      expect(() => senderContactSchema.parse(input)).toThrow();
    });

    it('should accept senderName at max length', () => {
      const input = { senderName: 'a'.repeat(255) };
      expect(() => senderContactSchema.parse(input)).not.toThrow();
    });

    it('should reject non-string senderName', () => {
      const input = { senderName: 123 };
      expect(() => senderContactSchema.parse(input)).toThrow();
    });

    it('should reject non-string senderEmail', () => {
      const input = { senderEmail: 123 };
      expect(() => senderContactSchema.parse(input)).toThrow();
    });

    it('should reject non-string replyTo', () => {
      const input = { replyTo: 123 };
      expect(() => senderContactSchema.parse(input)).toThrow();
    });
  });

  describe('subjectSchema', () => {
    it('should accept valid subject', () => {
      const input = 'Test Subject Line';
      expect(() => subjectSchema.parse(input)).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => subjectSchema.parse('')).toThrow();
    });

    it('should accept subject at max length', () => {
      const input = 'a'.repeat(500);
      expect(() => subjectSchema.parse(input)).not.toThrow();
    });

    it('should reject subject exceeding max length', () => {
      const input = 'a'.repeat(501);
      expect(() => subjectSchema.parse(input)).toThrow();
    });

    it('should reject non-string subject', () => {
      expect(() => subjectSchema.parse(123)).toThrow();
      expect(() => subjectSchema.parse(null)).toThrow();
      expect(() => subjectSchema.parse(undefined)).toThrow();
    });

    it('should accept single character subject', () => {
      expect(() => subjectSchema.parse('a')).not.toThrow();
    });

    it('should accept subject with special characters', () => {
      const input = 'Subject with special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      expect(() => subjectSchema.parse(input)).not.toThrow();
    });

    it('should accept subject with unicode characters', () => {
      const input = 'Subject with unicode: 你好 مرحبا 🎉';
      expect(() => subjectSchema.parse(input)).not.toThrow();
    });
  });
});
