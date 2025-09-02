// 使用 CDN 注入的 CryptoJS（见 main.html）
// 移除直接从 node_modules 的浏览器端导入

// 图片处理相关功能
// document.getElementById('imageInput').addEventListener('change', function(e) {
//     const file = e.target.files[0];
//     if (file) {
//         const reader = new FileReader();
//         reader.onload = function(e) {
//             const preview = document.getElementById('imagePreview');
//             preview.innerHTML = `<img src="${e.target.result}" alt="预览图">`;
//         }
//         reader.readAsDataURL(file);
//     }
// });

document.getElementById('base64Encode').addEventListener('click', function() {
    let res = base64Encode(document.getElementById('inputText').value);
    console.log("base64Encode=" + res);
    
});
document.getElementById('base64Decode').addEventListener('click', function() {
    let rest = base64Decode(document.getElementById('inputText').value);
    console.log("base64Decode=" + rest);
    
});

function processImage(type) {
    // 这里实现图片处理逻辑
    console.log('处理图片:', type);
}

// 加密相关功能由下方统一的 encrypt 实现

// Base64编码
function base64Encode(str) {
    // 使用原生btoa进行Base64编码，需先将UTF-8字符串转为Unicode字符串
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        alert('Base64编码失败，请检查输入内容');
        return '';
    }
}

// Base64解码
function base64Decode(str) {
    console.log("base64Decode=" + str);
    
    // 使用原生atob进行Base64解码，需先将Unicode字符串转为UTF-8字符串
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        alert('Base64解码失败，请检查输入内容');
        return '';
    }
}


/**
 * 使用AES加密，支持自定义偏移量（IV）
 * @param {string} plaintext 明文
 * @param {string} key 密钥
 * @param {string} iv 偏移量
 * @returns {string} 加密后的Base64字符串
 */
function aesEncryptWithIV(plaintext, key, iv) {
    // 依赖 window.CryptoJS（由 main.html 注入）
    // key和iv都需要为16字节（128位），如不足需补齐
    const cryptoJs = window.CryptoJS;
    const keyUtf8 = cryptoJs.enc.Utf8.parse(key);
    const ivUtf8 = cryptoJs.enc.Utf8.parse(iv);
    const encrypted = cryptoJs.AES.encrypt(plaintext, keyUtf8, {
        iv: ivUtf8,
        mode: cryptoJs.mode.CBC,
        padding: cryptoJs.pad.Pkcs7
    });
    return encrypted.toString();
}

// 示例：在encrypt函数中调用
// 用法：encrypt('aes', '偏移量字符串');
// function encrypt(type, iv = '1234567890abcdef') {
//     const input = document.getElementById('inputText').value;
//     let output = '';
//     let originData = input;
//     console.log("originData=" + originData);

//     // 这里假设密钥为16位字符串，可根据实际需求修改
//     const key = 'abcdef1234567890';

//     if (type === 'aes') {
//         output = aesEncryptWithIV(originData, key, iv);
//     } else if (type === 'rsa') {
//         output = '这里实现RSA加密';
//     }

//     document.getElementById('outputText').value = output;
// }

/**
 * 生成RSA密钥对（仅用于演示，实际生产环境请在后端生成并妥善保管私钥）
 * 这里只做简单演示，密钥长度为1024位
 */
let rsaKeyPair = null;

async function generateRSAKeyPair() {
    if (window.crypto && window.crypto.subtle) {
        // 使用Web Crypto API生成密钥对
        rsaKeyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 1024,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            true,
            ["encrypt", "decrypt"]
        );
    } else {
        alert("当前浏览器不支持Web Crypto API，无法进行RSA加密。");
    }
}

/**
 * 导出公钥为PEM格式字符串
 */
async function exportPublicKeyPEM() {
    if (!rsaKeyPair) {
        await generateRSAKeyPair();
    }
    const spki = await window.crypto.subtle.exportKey("spki", rsaKeyPair.publicKey);
    const b64 = window.btoa(String.fromCharCode(...new Uint8Array(spki)));
    const pem = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    return pem;
}

/**
 * 使用RSA公钥加密
 * @param {string} plaintext 明文
 * @returns {Promise<string>} Base64密文
 */
async function rsaEncrypt(plaintext) {
    if (!rsaKeyPair) {
        await generateRSAKeyPair();
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        rsaKeyPair.publicKey,
        data
    );
    // 转为Base64
    return window.btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * 使用RSA私钥解密
 * @param {string} ciphertext Base64密文
 * @returns {Promise<string>} 明文
 */
async function rsaDecrypt(ciphertext) {
    if (!rsaKeyPair) {
        alert("请先进行加密操作以生成密钥对。");
        return '';
    }
    const encryptedData = Uint8Array.from(window.atob(ciphertext), c => c.charCodeAt(0));
    try {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            rsaKeyPair.privateKey,
            encryptedData
        );
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (e) {
        alert("RSA解密失败，请检查密文或密钥。");
        return '';
    }
}

// 扩展encrypt函数支持RSA加密
// async function encrypt(type, iv = '1234567890abcdef') {
//     const input = document.getElementById('inputText').value;
//     let output = '';
//     let originData = input;
//     console.log("originData=" + originData);

//     // 这里假设密钥为16位字符串，可根据实际需求修改
//     const key = 'abcdef1234567890';

//     if (type === 'aes') {
//         output = aesEncryptWithIV(originData, key, iv);
//         document.getElementById('outputText').value = output;
//     } else if (type === 'rsa') {
//         output = await rsaEncrypt(originData);
//         document.getElementById('outputText').value = output;
//     }
// }

// RSA解密按钮逻辑（可在页面添加按钮调用此函数）
async function rsaDecryptAction() {
    const input = document.getElementById('outputText').value;
    const result = await rsaDecrypt(input);
    if (result !== undefined) {
        document.getElementById('inputText').value = result;
    }
}


// 拖拽上传功能
const dropArea = document.getElementById('imageUploadArea');

if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
}

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

if (dropArea) {
    dropArea.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="预览图">`;
        }
        reader.readAsDataURL(files[0]);
    }
}

// 统一的 encrypt，支持 AES 与 RSA，并供内联按钮调用
async function encrypt(type, iv = '1234567890abcdef') {
    const input = document.getElementById('inputText').value;
    let output = '';
    const originData = input;
    console.log("originData=" + originData);

    const key = 'abcdef1234567890';

    if (type === 'aes') {
        output = aesEncryptWithIV(originData, key, iv);
        document.getElementById('outputText').value = output;
    } else if (type === 'rsa') {
        output = await rsaEncrypt(originData);
        document.getElementById('outputText').value = output;
    }
}

// 将需要被按钮/内联事件访问的函数挂到全局
window.encrypt = encrypt;
window.base64Encode = base64Encode;
window.base64Decode = base64Decode;
window.rsaDecryptAction = rsaDecryptAction;