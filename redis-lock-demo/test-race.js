const axios = require('axios');

const instances = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003'
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRaceCondition() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: RACE CONDITION (Broken)');
    console.log('='.repeat(60));
    
    await axios.get(`${instances[0]}/reset`);
    
    console.log('\nSending 5 simultaneous requests...\n');
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
        const inst = instances[i % instances.length];
        promises.push(axios.get(`${inst}/increment/race-condition`));
    }
    
    const results = await Promise.all(promises);
    results.forEach((res, i) => {
        console.log(`Request ${i+1} (${res.data.instance}): ${res.data.oldValue} → ${res.data.newValue}`);
    });
    
    const final = await axios.get(`${instances[0]}/counter`);
    console.log(`\n FINAL COUNTER: ${final.data.counter}`);
    console.log(`   Expected: 5 | Lost: ${5 - final.data.counter} updates!\n`);
}

async function testWithLock() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: WITH LOCK (Proper Queueing)');
    console.log('='.repeat(60));
    
    await axios.get(`${instances[0]}/reset`);
    
    console.log('\nSending 5 simultaneous requests...');
    console.log('(They will queue up and execute sequentially)\n');
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
        const inst = instances[i % instances.length];
        promises.push(axios.get(`${inst}/increment/with-lock`));
    }
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    results.forEach((res, i) => {
        const data = res.data;
        console.log(`Request ${i+1} (${data.instance}): ${data.oldValue} → ${data.newValue} (waited ${data.waitTimeMs}ms)`);
    });
    
    const final = await axios.get(`${instances[0]}/counter`);
    console.log(`\n FINAL COUNTER: ${final.data.counter}`);
    console.log(`   Expected: 5 | All updates succeeded!`);
    console.log(`   Total time: ${totalTime}ms (requests executed sequentially)\n`);
}

async function testAtomic() {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ TEST 3: ATOMIC OPERATION (Best Solution)');
    console.log('='.repeat(60));
    
    await axios.get(`${instances[0]}/reset`);
    
    console.log('\nSending 5 simultaneous requests...\n');
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
        const inst = instances[i % instances.length];
        promises.push(axios.get(`${inst}/increment/atomic`));
    }
    
    const results = await Promise.all(promises);
    results.forEach((res, i) => {
        console.log(`Request ${i+1} (${res.data.instance}): → ${res.data.newValue}`);
    });
    
    const final = await axios.get(`${instances[0]}/counter`);
    console.log(`\n FINAL COUNTER: ${final.data.counter}`);
    console.log(`   Expected: 5 | Redis atomic operation!`);
    console.log(`   No lock needed - Redis handles it internally\n`);
}

async function run() {
    console.log('\n RACE CONDITION DEMO - See the difference!\n');
    
    await testRaceCondition();
    await sleep(2000);
    
    await testWithLock();
    await sleep(2000);
    
    await testAtomic();
}

run();