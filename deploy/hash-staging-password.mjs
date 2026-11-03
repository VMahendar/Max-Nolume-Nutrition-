// Supply the password on stdin, never as a command argument or in source control.
import {passwordHash} from '../commerce.mjs';
let password='';for await(const chunk of process.stdin){password+=chunk;if(Buffer.byteLength(password)>130)throw Error('Password too long.');}
password=password.replace(/\r?\n$/,'');
if(password.length<16)throw Error('Use at least 16 characters for the staging access password.');
console.log(await passwordHash(password));
