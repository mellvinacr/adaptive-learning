// Native fetch is available in Node.js 18+

async function seed() {
    try {
        const response = await fetch('http://localhost:3000/api/seed', {
            method: 'POST'
        });
        const data = await response.json();
        console.log('Seed result:', data);
    } catch (error) {
        console.error('Seed failed:', error);
    }
}

seed();
