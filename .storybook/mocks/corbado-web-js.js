// Storybook-only mock for '@corbado/web-js'
module.exports = {
  default: {
    load: async () => ({
      passkey: {
        login: async () => {
          const mode = typeof window !== 'undefined' && window.__CORBADO_MODE ? window.__CORBADO_MODE : 'success';
          if (mode === 'fail') {
            throw new Error('Simulated Corbado failure');
          }
          return { id_token: 'mock_token' };
        },
      },
    }),
  },
};
