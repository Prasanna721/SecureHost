const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { uploadScreenshot } = require('./image-uploader');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const WATCH_DIRS = [
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Downloads')
];

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

const processedFiles = new Set();

function isScreenshotFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(fileName);
  
  // Check for common screenshot file patterns
  const screenshotPatterns = [
    /^screenshot/i,
    /^screen shot/i,
    /^capture/i,
    /^screen_recording/i,
    /^screen recording/i,
    /^cleanshot/i,
    /^\d{4}-\d{2}-\d{2} at \d/i, // macOS screenshot format
    /^screenshot \d{4}-\d{2}-\d{2}/i
  ];
  
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'];
  
  return imageExtensions.includes(ext) && 
         screenshotPatterns.some(pattern => pattern.test(fileName));
}

async function processScreenshot(filePath) {
  if (processedFiles.has(filePath)) {
    return;
  }
  
  try {
    // Wait a moment for the file to be fully written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!fs.existsSync(filePath)) {
      console.log(`File no longer exists: ${filePath}`);
      return;
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.log(`File is empty, skipping: ${filePath}`);
      return;
    }
    
    processedFiles.add(filePath);
    
    // Copy the screenshot to our uploads directory
    const timestamp = Date.now();
    const originalName = path.basename(filePath);
    const ext = path.extname(originalName);
    const newFilename = `user-screenshot-${uuidv4()}-${timestamp}${ext}`;
    const newFilePath = path.join(UPLOAD_DIR, newFilename);
    
    fs.copyFileSync(filePath, newFilePath);
    
    console.log(`📸 Screenshot detected: ${originalName}`);
    console.log(`   Copied to: ${newFilename}`);
    
    // Upload to public hosting service
    let publicImageUrl;
    try {
      publicImageUrl = await uploadScreenshot(newFilePath);
      console.log(`🌐 Public URL: ${publicImageUrl}`);
    } catch (uploadError) {
      console.error('❌ Failed to upload screenshot:', uploadError.message);
      console.log('📝 Falling back to local URL (analysis may fail)');
      publicImageUrl = `http://localhost:3001/uploads/${newFilename}`;
    }
    
    const scanResult = {
      screenshot_path: newFilePath,
      image_url: publicImageUrl,
      rules_text: DEFAULT_RULES
    };
    
    await fetch('http://localhost:3001/api/scan-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scanResult)
    });
    
    console.log('✅ Queued for Pipelex analysis');
    
    await runPiplexAnalysis(newFilePath, publicImageUrl, DEFAULT_RULES);
    
  } catch (error) {
    console.error('❌ Error processing screenshot:', error);
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
  console.log('🔍 Starting screenshot monitoring...');
  console.log(`📁 Watching directories:`);
  WATCH_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`   ✅ ${dir}`);
    } else {
      console.log(`   ❌ ${dir} (does not exist)`);
    }
  });
  console.log(`💾 Screenshots will be copied to: ${UPLOAD_DIR}`);
  
  const watcher = chokidar.watch(WATCH_DIRS, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // don't process existing files
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filePath) => {
      if (isScreenshotFile(filePath)) {
        console.log(`🆕 New file detected: ${path.basename(filePath)}`);
        processScreenshot(filePath);
      }
    })
    .on('ready', () => {
      console.log('🎯 Screenshot monitor ready! Take a screenshot and see it analyzed...');
    })
    .on('error', (error) => {
      console.error('❌ Watcher error:', error);
    });

  return watcher;
}

if (require.main === module) {
  startMonitoring();
}

module.exports = { processScreenshot, startMonitoring };