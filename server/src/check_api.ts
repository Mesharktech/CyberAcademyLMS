
import axios from 'axios';

async function main() {
    try {
        console.log('Fetching courses...');
        const res = await axios.get('http://localhost:5000/api/courses');
        console.log('Status:', res.status);
        console.log('Courses:', res.data.length);
        if (res.data.length > 0) {
            const first = res.data[0];
            console.log('First Course:', first.title, 'Slug:', first.slug);

            console.log(`Fetching details for ${first.slug}...`);
            const detailRes = await axios.get(`http://localhost:5000/api/courses/${first.slug}`);
            console.log('Detail Status:', detailRes.status);
            console.log('Modules:', detailRes.data.modules.length);
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('API Error:', error.message);
            if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
        } else {
            console.error('Error:', error);
        }
    }
}

main();
