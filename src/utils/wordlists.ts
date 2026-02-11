/**
 * Curated list of common PDF passwords for "John the Ripper" style dictionary attacks.
 * Includes common numeric patterns, default passwords, and frequently used strings.
 */
export const COMMON_PASSWORDS = [
    '0000', '1111', '1234', '12345', '123456', '12345678', '111111', '888888', 'password',
    '123', '789', 'admin', 'root', 'qwerty', '1q2w3e', 'Welcome1', 'Pdf123',
    // Numeric ranges
    ...Array.from({ length: 100 }, (_, i) => i.toString().padStart(4, '0')),
    ...Array.from({ length: 100 }, (_, i) => i.toString().padStart(6, '0')),
    // Years
    ...Array.from({ length: 30 }, (_, i) => (2025 - i).toString()),
    // Common strings
    'user', 'pdf', 'unlock', 'open', 'secret', 'secure', 'private', 'file',
    'test', 'guest', 'abcd', 'zxcv', 'asdf', 'qwert'
];


/**
 * Applies common mutations to a wordlist (Rules).
 * e.g. password -> Password, password123, password@2024
 */
export const APPLY_RULES = (baseWords: string[]): string[] => {
    const mutated: string[] = [];
    const years = ['2023', '2024', '2025', '2026'];
    const symbols = ['!', '@', '#', '$'];

    baseWords.forEach(word => {
        mutated.push(word);
        // Capitalize
        mutated.push(word.charAt(0).toUpperCase() + word.slice(1));
        // Suffixes
        years.forEach(y => mutated.push(word + y));
        years.forEach(y => mutated.push(word + '@' + y));
        symbols.forEach(s => mutated.push(word + s));
        mutated.push(word + '123');
    });

    return Array.from(new Set(mutated)); // Deduplicate
};

export const GET_WORDLIST = (type: 'quick' | 'full' | 'turbo') => {
    if (type === 'quick') return COMMON_PASSWORDS.slice(0, 20);
    if (type === 'turbo') return APPLY_RULES(COMMON_PASSWORDS);
    return COMMON_PASSWORDS;
};
