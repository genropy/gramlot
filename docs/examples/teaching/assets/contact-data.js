// Fictional contact data supplied by the teaching host, outside the recipe.
function randomContacts(count, Bag) {
    const names = ['Anna', 'Marco', 'Giulia', 'Luca', 'Sara', 'Paolo', 'Elena', 'Matteo'];
    const surnames = ['Rossi', 'Bianchi', 'Russo', 'Romano', 'Costa', 'Ferrari'];
    const streets = ['Via Roma', 'Via Verdi', 'Via Garibaldi', 'Via delle Rose'];
    const cities = ['Milano', 'Torino', 'Bologna', 'Firenze', 'Verona'];
    const pick = values => values[Math.floor(Math.random() * values.length)];
    const contacts = new Bag();
    for (let index = 1; index <= count; index++) {
        const name = pick(names), surname = pick(surnames);
        contacts.setItem(`c${index}.name`, name);
        contacts.setItem(`c${index}.surname`, surname);
        contacts.setItem(`c${index}.address`, `${pick(streets)} ${1 + Math.floor(Math.random() * 120)}, ${pick(cities)}`);
        contacts.setItem(`c${index}.phone`, `+39 320 ${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`);
        contacts.setItem(`c${index}.email`, `${name}.${surname}${index}@example.test`.toLowerCase());
    }
    return contacts;
}

function populate(node, Bag) {
    const count = 1 + Math.floor(Math.random() * 10);
    node.SET('contacts', randomContacts(count, Bag));
    node.SET('visibleContacts', count);
}

export function install(target) {
    target.contactData = {populate};
}
