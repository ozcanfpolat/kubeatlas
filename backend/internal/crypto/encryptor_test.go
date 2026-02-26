package crypto

import (
	"testing"
)

func TestEncryptor(t *testing.T) {
	encryptor, err := NewEncryptor("test-encryption-key-for-testing")
	if err != nil {
		t.Fatalf("Failed to create encryptor: %v", err)
	}

	t.Run("EncryptDecrypt", func(t *testing.T) {
		plaintext := []byte("This is a secret token")

		encrypted, err := encryptor.Encrypt(plaintext)
		if err != nil {
			t.Fatalf("Encryption failed: %v", err)
		}

		// Encrypted should be different from plaintext
		if string(encrypted) == string(plaintext) {
			t.Error("Encrypted data should be different from plaintext")
		}

		decrypted, err := encryptor.Decrypt(encrypted)
		if err != nil {
			t.Fatalf("Decryption failed: %v", err)
		}

		if string(decrypted) != string(plaintext) {
			t.Errorf("Decrypted text doesn't match original. Got: %s, Want: %s", decrypted, plaintext)
		}
	})

	t.Run("EncryptDecryptString", func(t *testing.T) {
		plaintext := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"

		encrypted, err := encryptor.EncryptString(plaintext)
		if err != nil {
			t.Fatalf("String encryption failed: %v", err)
		}

		// Should be base64 encoded
		if encrypted == plaintext {
			t.Error("Encrypted string should be different from plaintext")
		}

		decrypted, err := encryptor.DecryptString(encrypted)
		if err != nil {
			t.Fatalf("String decryption failed: %v", err)
		}

		if decrypted != plaintext {
			t.Errorf("Decrypted string doesn't match. Got: %s, Want: %s", decrypted, plaintext)
		}
	})

	t.Run("EncryptToken", func(t *testing.T) {
		token := "eyJhbGciOiJSUzI1NiIsImtpZCI6IkRFRkFVTFQifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50In0"

		encrypted, err := encryptor.EncryptToken(token)
		if err != nil {
			t.Fatalf("Token encryption failed: %v", err)
		}

		decrypted, err := encryptor.DecryptToken(encrypted)
		if err != nil {
			t.Fatalf("Token decryption failed: %v", err)
		}

		if decrypted != token {
			t.Errorf("Decrypted token doesn't match. Got: %s, Want: %s", decrypted, token)
		}
	})

	t.Run("InvalidCiphertext", func(t *testing.T) {
		_, err := encryptor.Decrypt([]byte("invalid"))
		if err == nil {
			t.Error("Expected error for invalid ciphertext")
		}
	})

	t.Run("DifferentKeysCannotDecrypt", func(t *testing.T) {
		encryptor2, _ := NewEncryptor("different-key")

		encrypted, err := encryptor.EncryptString("secret")
		if err != nil {
			t.Fatalf("Encryption failed: %v", err)
		}

		_, err = encryptor2.DecryptString(encrypted)
		if err == nil {
			t.Error("Expected error when decrypting with different key")
		}
	})

	t.Run("EmptyString", func(t *testing.T) {
		encrypted, err := encryptor.EncryptString("")
		if err != nil {
			t.Fatalf("Empty string encryption failed: %v", err)
		}

		decrypted, err := encryptor.DecryptString(encrypted)
		if err != nil {
			t.Fatalf("Empty string decryption failed: %v", err)
		}

		if decrypted != "" {
			t.Errorf("Expected empty string, got: %s", decrypted)
		}
	})
}

func BenchmarkEncrypt(b *testing.B) {
	encryptor, _ := NewEncryptor("benchmark-key")
	data := []byte("benchmark-test-data-for-encryption-performance")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = encryptor.Encrypt(data)
	}
}

func BenchmarkDecrypt(b *testing.B) {
	encryptor, _ := NewEncryptor("benchmark-key")
	data := []byte("benchmark-test-data-for-encryption-performance")
	encrypted, _ := encryptor.Encrypt(data)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = encryptor.Decrypt(encrypted)
	}
}
