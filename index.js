require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const excelJS = require('exceljs');

const dotFilter = [':', ',', '-', '.', '!', "'", '"', ';', '_', '<', '>', '|', '', '^', '/', '*', '+', '$', '=', ')', '(', '—', '–', '?', '[', ']', '%'];

let currentArray;
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        resizable: true,
        fullscreen: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/js/preload.js'),
        }
    })
    mainWindow.menuBarVisible = false

    mainWindow.loadFile('src/html/index.html')

    //mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
    await createWindow();

    app.on('activate', async () => {
        if(BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
});

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
});



(async () => {
    try {
        await import('pdfjs-dist/webpack.mjs'); // Use dynamic import()
        const pdfjsLib = await import('pdfjs-dist');

        ipcMain.on('readFile', (event, data) => {
            const fileType = data[0]
            const filePath = data[1]
            fileRead(fileType, filePath, data[2]).then(content => {
                //console.log(content)
                event.reply('fileContent', content);
            }).catch(error => {
                console.log(error)
                event.reply('fileContent', { error: error });
            });
        });

        ipcMain.on('saveAsExcel', (event, data) => {
            const workbook = new excelJS.Workbook();
            const worksheet = workbook.addWorksheet('Data');

            worksheet.addRow(['Kelime', 'Kullanım Sıklığı']);

            currentArray.forEach(row => worksheet.addRow(row));

            const filePath = path.join(`${data[0].split('.pdf')[0]}-analyzed.xlsx`);
            workbook.xlsx.writeFile(filePath)
                .then(() => {
                    event.reply('excelSaved', filePath)
                    //console.log('Excel saved successfully: ', filePath);
                })
                .catch(err => {
                    console.error('Error saving Excel: ', err);
                });
        })

        async function fileRead(fileType, filePath, check) {
            if(fileType === 'application/pdf'){
                return extractPdfText(filePath, check)
            } else if(fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                return extractDocxText(filePath, check)
            }
        }

        async function extractPdfText(filePath, check) {
            const pdfData = fs.readFileSync(filePath);
            const converted = new Uint8Array(pdfData)
            const task = await pdfjsLib.getDocument(converted);
            const pdf = await task.promise;
            const numPages = pdf.numPages;
            let result = '';
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                result += textContent.items.map(item => item.str).join(' ');
            }
            let array = {};
            result.split(' ').forEach(word => {
                word = word.toLowerCase();
                
                
                
                for (let i = (word.length - 1); i > 0; i--) {
                    const last = word[i];
                    if (dotFilter.includes(last)) {
                        if (word[0] === '(' && last === ')') {}
                        else word = word.slice(0, word.length - 1); //console.log(word);
                    }
                    else break;
                }
                if(!dotFilter.includes(word)){
                    if(check) {
                        if(array[word]) array[word]++
                        else array[word] = 1;
                    } else {
                        if(isNaN(word)) {
                            if(array[word]) array[word]++
                            else array[word] = 1;
                        }
                    }
                    
                }
            })
            const entries = Object.entries(array).sort((a, b) => {
                if(b[1] !== a[1]) return b[1] - a[1];
                else return a[0].localeCompare(b[0]);
            })
            const sorted = Object.fromEntries(entries);
            currentArray = Object.entries(sorted);
            return Object.entries(sorted);
        }

        async function extractDocxText(filePath, check) {
            return '';
        }
  
    } catch (error) {
      console.error('Error loading PDF.js:', error);
    }
  })();