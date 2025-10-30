const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const SCREENSHOT_INTERVAL = 5000; // Check every 5 seconds

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const DEFAULT_RULES = `
# Privacy Classification Rules

## CONFIDENTIAL (Rating 8-10)
- API keys, passwords, tokens, certificates
- Customer personal data (SSN, credit cards, addresses)
- Financial data, salary information
- Medical records, HIPAA protected data
- Legal documents, contracts
- Internal company strategies, unreleased products

## INTERNAL (Rating 5-7)
- Employee directories, org charts
- Internal system screenshots, dashboards
- Company financial reports (non-public)
- Internal project timelines, roadmaps
- Customer lists, business contacts

## RESTRICTED (Rating 3-4)
- Source code, architecture diagrams
- Database schemas, system configurations
- Training materials, internal processes
- Performance data, metrics

## PUBLIC (Rating 0-2)
- Marketing materials, public websites
- Published documentation
- General business information
- Public social media content
`;

let lastScreenshotTime = 0;
let isProcessing = false;

async function captureAndAnalyze() {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  try {
    const img = await screenshot({ format: 'png' });
    const timestamp = Date.now();
    
    if (timestamp - lastScreenshotTime < 2000) {
      isProcessing = false;
      return;
    }
    
    const filename = `screenshot-${uuidv4()}-${timestamp}.png`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const imageUrl = `http://localhost:3001/uploads/${filename}`;
    
    fs.writeFileSync(filePath, img);
    lastScreenshotTime = timestamp;
    
    console.log(`Screenshot captured: ${filename}`);
    
    const scanResult = {
      screenshot_path: filePath,
      image_url: imageUrl,
      rules_text: DEFAULT_RULES
    };
    
    await fetch('http://localhost:3001/api/scan-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scanResult)
    });
    
    console.log('Queued for Pipelex analysis');
    
    await runPiplexAnalysis(filePath, imageUrl, DEFAULT_RULES);
    
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  } finally {
    isProcessing = false;
  }
}

async function runPiplexAnalysis(screenshotPath, imageUrl, rulesText) {
  try {
    const inputsPath = path.join(__dirname, '../results/inputs.json');
    const workflowPath = path.join(__dirname, '../results/scan_image.plx');
    
    const inputs = {
      image: {
        concept: "native.Image",
        content: {
          url: imageUrl
        }
      },
      rules: {
        concept: "native.Text",
        content: rulesText
      }
    };
    
    fs.writeFileSync(inputsPath, JSON.stringify(inputs, null, 2));
    
    console.log('Running Pipelex workflow...');
    
    const command = `cd "${path.dirname(inputsPath)}" && pipelex run scan_image.plx`;
    
    exec(command, { 
      env: { ...process.env, PATH: `${process.env.PATH}:${path.join(process.cwd(), '.venv/bin')}` }
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Pipelex execution error:', error);
        return;
      }
      
      if (stderr) {
        console.error('Pipelex stderr:', stderr);
      }
      
      console.log('Pipelex output:', stdout);
      
      try {
        const workingMemoryPath = path.join(path.dirname(inputsPath), 'working_memory_01.json');
        
        if (fs.existsSync(workingMemoryPath)) {
          const workingMemory = JSON.parse(fs.readFileSync(workingMemoryPath, 'utf8'));
          
          const lastStuff = workingMemory.stuff_list[workingMemory.stuff_list.length - 1];
          
          if (lastStuff && lastStuff.content) {
            const result = {
              screenshot_path: screenshotPath,
              pipelex_result: lastStuff.content
            };
            
            await fetch('http://localhost:3001/api/scan-results', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(result)
            });
            
            console.log('Analysis result saved to database');
          }
        }
      } catch (parseError) {
        console.error('Error parsing Pipelex results:', parseError);
      }
    });
    
  } catch (error) {
    console.error('Error running Pipelex analysis:', error);
  }
}

function startMonitoring() {
  console.log('Starting screenshot monitoring...');
  console.log(`Screenshots will be saved to: ${UPLOAD_DIR}`);
  
  setInterval(captureAndAnalyze, SCREENSHOT_INTERVAL);
}

if (require.main === module) {
  startMonitoring();
}

module.exports = { captureAndAnalyze, startMonitoring };