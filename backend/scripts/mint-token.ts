import { signAccessToken } from '../src/common/utils/jwt';
import fs from 'node:fs';

const token = signAccessToken({
  sub: 'aec05433-4117-46f0-b8bc-4060445914ab',
  uuid: 'aec05433-4117-46f0-b8bc-4060445914ab',
  email: 'flowtest@loanex.in',
  mobile: '9876543210',
});
fs.writeFileSync(process.argv[2], token, 'utf8');
console.log('token written');
