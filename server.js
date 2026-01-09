import ical, {ICalCategory} from 'ical-generator';
import fs from 'fs';
import express from 'express';

const calender = ical({ name: 'My School Stuff' });
calender.timezone('Germany/Berlin');

const categories = {
    homework: ICalCategory.WORK,
    exam: ICalCategory.EXAM,
    project: ICalCategory.PROJECT,
    other: ICalCategory.OTHER
}

const app = express();
const PORT = process.env.PORT || 3000;

if (fs.existsSync('events.json')) {
    const data = fs.readFileSync('events.json', 'utf-8');
    const events = JSON.parse(data);

    events.forEach(event => {
        calender.createEvent({
            start: new Date(event.start),
            end: new Date(event.end),
            summary: event.summary,
            description: event.description,
            location: event.location,
            url: event.url
        });
    });
} else {
    fs.writeFileSync('events.json', '[]');
}

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

app.get('/calendar.ics', (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.setHeader('Content-Type', 'text/calendar');
    calender.serve(res);
});

app.get('/events', (req, res) => {
    const data = fs.readFileSync('events.json', 'utf-8');
    const events = JSON.parse(data);
    res.json(events);
});


app.post('/add-event', async (req, res) => {
    express.json();
    let { start, end, summary, description, location, url, type } = req.body;
    if (!start || !end || !summary) {
        return res.status(400).send('Missing required fields: start, end, summary');
    }

    const newEvent = {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        summary: cleanText(summary),
        description: description ? cleanText(description) : '',
        location: location ? cleanText(location) : '',
        url: url ? url.trim() : '',
        type: categories[type] || ICalCategory.OTHER
    };

    const data = fs.readFileSync('events.json', 'utf-8');
    const events = JSON.parse(data);
    events.push(newEvent);
    fs.writeFileSync('events.json', JSON.stringify(events, null, 2));

    calender.createEvent({
        start: new Date(newEvent.start),
        end: new Date(newEvent.end),
        summary: newEvent.summary,
        description: newEvent.description,
        location: newEvent.location,
        url: newEvent.url,
        categories: [newEvent.type]
    });

    res.status(201).send('Event added successfully');
});

app.put('/update-event/:index', async (req, res) => {
    express.json();
    const index = parseInt(req.params.index, 10);
    let { start, end, summary, description, location, url, type } = req.body;

    const data = fs.readFileSync('events.json', 'utf-8');
    const events = JSON.parse(data);

    if (isNaN(index) || index < 0 || index >= events.length) {
        return res.status(404).send('Event not found');
    }
    
    if (start) events[index].start = new Date(start).toISOString();
    if (end) events[index].end = new Date(end).toISOString();
    if (summary) events[index].summary = cleanText(summary);
    if (description) events[index].description = cleanText(description);
    if (location) events[index].location = cleanText(location);
    if (url) events[index].url = url.trim();
    if (type) events[index].type = categories[type] || ICalCategory.OTHER;

    fs.writeFileSync('events.json', JSON.stringify(events, null, 2));
    calender.events().splice(index, 1);
    calender.createEvent({
        start: new Date(events[index].start),
        end: new Date(events[index].end),
        summary: events[index].summary,
        description: events[index].description,
        location: events[index].location,
        url: events[index].url,
        categories: [events[index].type]
    });

    res.send('Event updated successfully');
});

app.delete('/delete-event/:index', (req, res) => {
    const index = parseInt(req.params.index, 10);
    
    const data = fs.readFileSync('events.json', 'utf-8');
    const events = JSON.parse(data);
    if (isNaN(index) || index < 0 || index >= events.length) {
        return res.status(404).send('Event not found');
    }

    events.splice(index, 1);
    fs.writeFileSync('events.json', JSON.stringify(events, null, 2));
    calender.events().splice(index, 1);
    
    res.send('Event deleted successfully');
});

function cleanText(text) {
    return text.replace(/[\n\r]+/g, ' ').trim();
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
