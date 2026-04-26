const express = require('express');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const PORT = 5500;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/route', (req, res) => {
    const { start, end, trafficPenalties } = req.body;

    if (!start || !end) {
        return res.status(400).json({ error: 'Start and end nodes are required' });
    }

    const backendExe = process.platform === 'win32' ?
        path.join(__dirname, 'backend', 'main.exe') :
        path.join(__dirname, 'backend', 'main');

    // Prepare arguments: start end [u v penalty ...]
    const args = [start, end];
    if (trafficPenalties && Array.isArray(trafficPenalties)) {
        trafficPenalties.forEach(p => {
            args.push(p.u);
            args.push(p.v);
            args.push(p.penalty.toString());
        });
    }

    const options = {
        cwd: path.join(__dirname, 'backend')
    };

    execFile(backendExe, args, options, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing backend:', error);
            console.error('stderr:', stderr);
            return res.status(500).json({ error: 'Internal server error running routing algorithm' });
        }

        try {
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (parseError) {
            console.error('Failed to parse output:', stdout);
            res.status(500).json({ error: 'Invalid output from backend algorithm' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
