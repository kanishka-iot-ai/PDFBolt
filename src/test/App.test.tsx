import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

describe('App', () => {
    it('renders without crashing', () => {
        render(
            <App />
        );
        // Basic check to see if something rendered, assuming there's some text in App
        // You might want to be more specific based on your App content
        expect(document.body).toBeInTheDocument();
    });
});
