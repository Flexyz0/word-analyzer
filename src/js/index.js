const fileInput = document.getElementById('fileInput');
const contentDiv = document.getElementById('content');
const checkbox = document.getElementById('numeric');
const saveButton = document.getElementById('saveButton');
const alertBox = document.getElementById('alertBox');

let file;

function readFile() {
    file = fileInput.files[0];
    saveButton.setAttribute('disabled', true);
    if (file) {
        console.log(file);
        ipcRenderer.send('readFile', [file.type, file.path, checkbox.checked]);
        alertBox.innerText = 'Hesaplanıyor...'
        ipcRenderer.on('fileContent', content => {
            alertBox.innerHTML = ''
            contentDiv.innerHTML = ''
            if(content.length === 0) {
                alertBox.innerText = 'Verdiğiniz dosyanın içinde bir yazı bulunamadı.'
            } else {
                content.forEach(value => {
                    const element = document.createElement('a');
                    const wordElement = document.createElement('span');
                    wordElement.textContent = value[0]
                    element.appendChild(wordElement)
                    element.appendChild(document.createTextNode(value[1]))
                    contentDiv.appendChild(element)
                });
                saveButton.removeAttribute('disabled')
            }
            //contentDiv.textContent = content
            console.log(content);
        });

        /*const fileType = file.type;

        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const reader = new FileReader();
            reader.onload = function(e) {
                console.log(e.target.result);
            };
            reader.readAsText(file);
        } else if (fileType === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = function(e) {
                const pdfData = e.target.result;

                PDFJS.getDocument({ data: pdfData }).then(pdf => {

                })
            };
            reader.readAsArrayBuffer(file);
        } else {
            contentDiv.textContent = 'Unsupported file type.';
        }*/
    } else {
        alertBox.textContent = 'Lütfen bir dosya seçin.';
    }
}

function saveAsExcel() {
    ipcRenderer.send('saveAsExcel', [file.path, file.name]);
    ipcRenderer.on('excelSaved', filePath => {
        alertBox.innerText = filePath + ' konumuna kaydedildi.'
    })
}