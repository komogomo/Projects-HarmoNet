const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, url, method, expectedStatus, expectedLocation = null, expectedBody = null) {
    console.log(`Testing ${name}...`);
    try {
        const options = {
            method,
            redirect: 'manual',
        };
        if (method !== 'GET') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify({});
        }

        const res = await fetch(url, options);

        if (res.status !== expectedStatus) {
            console.error(`[FAIL] ${name}: Expected status ${expectedStatus}, got ${res.status}`);
            return false;
        }

        if (expectedLocation) {
            const location = res.headers.get('location');
            // location might be absolute or relative
            if (!location || !location.includes(expectedLocation)) {
                console.error(`[FAIL] ${name}: Expected location to include ${expectedLocation}, got ${location}`);
                return false;
            }
        }

        if (expectedBody) {
            const body = await res.json();
            if (JSON.stringify(body) !== JSON.stringify(expectedBody)) {
                console.error(`[FAIL] ${name}: Expected body ${JSON.stringify(expectedBody)}, got ${JSON.stringify(body)}`);
                return false;
            }
        }

        console.log(`[PASS] ${name}`);
        return true;
    } catch (error) {
        console.error(`[ERROR] ${name}:`, error);
        return false;
    }
}

async function runTests() {
    let allPass = true;

    // 1. Page Access (Unauthenticated)
    allPass &= await testEndpoint(
        'Page: /sys-admin/tenants',
        `${BASE_URL}/sys-admin/tenants`,
        'GET',
        307,
        '/sys-admin/login'
    );

    // 2. API Access (Unauthenticated) - POST /api/sys-admin/tenants
    allPass &= await testEndpoint(
        'API: POST /api/sys-admin/tenants',
        `${BASE_URL}/api/sys-admin/tenants`,
        'POST',
        401,
        null,
        { error: 'Unauthorized' }
    );

    // 3. API Access (Unauthenticated) - PUT /api/sys-admin/tenants/[id]
    allPass &= await testEndpoint(
        'API: PUT /api/sys-admin/tenants/dummy',
        `${BASE_URL}/api/sys-admin/tenants/dummy-id`,
        'PUT',
        401,
        null,
        { error: 'Unauthorized' }
    );

    // 4. API Access (Unauthenticated) - DELETE /api/sys-admin/tenants/[id]
    allPass &= await testEndpoint(
        'API: DELETE /api/sys-admin/tenants/dummy',
        `${BASE_URL}/api/sys-admin/tenants/dummy-id`,
        'DELETE',
        401,
        null,
        { error: 'Unauthorized' }
    );

    if (allPass) {
        console.log('All tests passed!');
    } else {
        console.error('Some tests failed.');
        process.exit(1);
    }
}

// Wait for server to be ready
setTimeout(runTests, 5000);
