

var character = { name: "", age: "", morale: "", hunger: "", injuryLevel: "" };    

const food = [
    ['rations', 0.5],
    ['snack', 1],
    ['entree', 2],
    ['meal', 3],
    ['dessert', 2] // dessert is a treat, so it's worth more also beneficial for morale TODO
 ];

 const medical = [
    ['band aid', 1],
    ['bandage', 2],
    ['medicine', 3],
    ['first aid kit', 4]
 ];

 const weapon = [
    ['fist', 1],
    ['stick', 2],
    ['knife', 3],
    ['pistol', 4]   
 ];

const enemy = [
    ['zombie', 4 + Math.floor(Math.random() * 4)]
];

getPlayer().then(data => {
    character = data;
    console.log(character);
    document.getElementById('name').textContent = character.name;
    document.getElementById('age').textContent = character.age;
    document.getElementById('morale').textContent = character.morale;
    document.getElementById('hunger').textContent = character.hunger;
    document.getElementById('injuryLevel').textContent = character.injuryLevel;
}).catch(error => console.error(error));


function getPlayer() {
    return new Promise((resolve, reject) => {
        fetch('https://randomuser.me/api/?nat=au,br,ca,ch,de,dk,es,fi,fr,gb,ie,in,mx,nl,no,nz,rs,tr,ua,us')
            .then(response => response.json())
            .then(data => {
                const firstName = getName(data);
                const age = getAge();
                const morale = getMorale();
                const hunger = getHunger();
                const injuryLevel = getInjuryLevel();
                const playerData = { name: firstName, age: age, morale: morale, hunger: hunger, injuryLevel: injuryLevel };
                resolve(playerData);
            })
            .catch(error => reject(error));
    });
}

function getInjuryLevel() {
    const injuries = ['near death','near death','gravely injured','gravely injured','badly injured','badly injured','slightly injured','slightly injured','fine','fine'];
    const injuryLevel = injuries[injuries.length - 1];
    return injuryLevel;
}

function getHunger() {
    const hungerArray = ['near death','near death','starving','starving','hungry','hungry','fine','fine','full','full'];
    const hunger = hungerArray[7];
    return hunger;
}

function getMorale() {
    const moraleArray = ['terrible','terrible','bad','bad','ok','ok','good','good','excellent','excellent'];
    const randomIndex = Math.floor(Math.random() * moraleArray.length);
    const morale = moraleArray[randomIndex];
    return morale;
}
function getAge() {
    const ageArray = ['teen', 'adult', 'elder'];
    const randomIndex = Math.floor(Math.random() * ageArray.length);
    const age = ageArray[randomIndex];
    return age;
}

function getName(data) {
    return data.results[0].name.first;
}
