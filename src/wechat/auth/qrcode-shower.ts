import type { QRCode } from '../types.js'
import type { QRCodeShower } from './interfaces.js'
import qrcode from 'qrcode-terminal'

/**
 * 二维码显示器的默认实现（终端输出）
 */
export class QRCodeShowerImpl implements QRCodeShower {
  show(code: QRCode): void {
    qrcode.generate(code.qrcode_img_content, { small: true })
    console.log(`\n如果二维码无法显示，请在浏览器打开:\n${code.qrcode_img_content}\n`)
  }
}
