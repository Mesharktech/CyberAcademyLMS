
const http = require('http');

function fetch(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        console.log('Fetching list...');
        const listRes = await fetch('/api/courses');
        console.log('List Status:', listRes.status);
        const courses = JSON.parse(listRes.data);
        console.log('Courses count:', courses.length);

        if (courses.length > 0) {
            const slug = courses[0].slug;
            console.log(`Fetching detail for slug: ${slug}`);
            const detailRes = await fetch(`/api/courses/${slug}`);
            console.log('Detail Status:', detailRes.status);
            const course = JSON.parse(detailRes.data);
            console.log(`Course Title: ${course.title}`);
            console.log(`Modules count: ${course.modules ? course.modules.length : 0}`);
            if (course.modules && course.modules.length > 0) {
                console.log(`First Module: ${course.modules[0].title}`);
                console.log(`Content Length: ${course.modules[0].content.length}`);
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
