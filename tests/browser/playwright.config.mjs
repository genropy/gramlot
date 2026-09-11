export default {
    testDir: '.',
    workers: 1,
    use: {baseURL: process.env.GRAMLOT_TUTORIAL_URL || 'http://127.0.0.1:8051', headless: true},
};
