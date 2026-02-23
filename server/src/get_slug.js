
const http = require('http');

http.get('http://localhost:5000/api/courses', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const courses = JSON.parse(data);
            if (courses.length > 0) {
                console.log(`SLUG:${courses[0].slug}`);
            } else {
                console.log('NO_COURSES');
            }
        } catch (e) { console.log('ERROR'); }
    });
});
