describe('smoke test', () => {
    it('Jest is working', () => {
        expect(1 + 1).toEqual(2);
    });

    it('TypeScript types work', () => {
        const name: string = 'RepoChat';
        expect(name).toBe('RepoChat');
    });
});
