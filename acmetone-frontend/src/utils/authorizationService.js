import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { ElMessage } from 'element-plus';

/**
 * 授权文件服务 - 处理授权文件的生成、上传和下载
 */

/**
 * 将ArrayBuffer转换为base64字符串
 * @param {ArrayBuffer} buffer - 要转换的ArrayBuffer
 * @returns {string} - base64字符串
 */
const arrayBufferToBase64 = (buffer) => {
  const binary = new Uint8Array(buffer).reduce(
    (data, byte) => data + String.fromCharCode(byte),
    ''
  );
  return window.btoa(binary);
};

/**
 * 加载并注册字体到PDF文档
 * @param {object} doc - jsPDF文档实例
 * @returns {Promise<boolean>}
 */
const loadFonts = async (doc) => {
  try {
    console.log('开始加载中文字体');
    
    // 使用 XMLHttpRequest 加载字体文件，这比fetch更稳定
    const loadFont = (url) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        
        xhr.onload = function() {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error(`字体加载失败: ${this.statusText}`));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('网络错误，字体加载失败'));
        };
        
        xhr.send();
      });
    };

    // 加载字体文件
    console.log('开始加载常规字体文件');
    const normalFontBuffer = await loadFont('/fonts/HarmonyOS_Sans_SC_Light.ttf');
    console.log('常规字体加载完成');
    
    console.log('开始加载粗体字体文件');
    const boldFontBuffer = await loadFont('/fonts/HarmonyOS_Sans_SC_Bold.ttf');
    console.log('粗体字体加载完成');

    // 将字体数据转换为base64
    const normalFontBase64 = arrayBufferToBase64(normalFontBuffer);
    const boldFontBase64 = arrayBufferToBase64(boldFontBuffer);
    console.log('字体数据转换为base64完成');

    // 添加字体到PDF
    try {
      // 添加常规字体
      doc.addFileToVFS('HarmonyOS_Sans_SC_Light.ttf', normalFontBase64);
      doc.addFont('HarmonyOS_Sans_SC_Light.ttf', 'HarmonyOS', 'normal');
      console.log('常规字体添加到PDF成功');
      
      // 添加粗体字体
      doc.addFileToVFS('HarmonyOS_Sans_SC_Bold.ttf', boldFontBase64);
      doc.addFont('HarmonyOS_Sans_SC_Bold.ttf', 'HarmonyOS', 'bold');
      console.log('粗体字体添加到PDF成功');

      // 设置默认字体
      doc.setFont('HarmonyOS');
      
      // // 测试字体
      // doc.text('测试中文字体', 10, 30);
      // console.log('中文字体设置成功');
      
      return true;
    } catch (fontError) {
      console.error('字体处理失败:', fontError);
      return false;
    }
  } catch (err) {
    console.error('字体加载失败:', err);
    return false;
  }
};

/**
 * 生成授权书文件
 * @param {number} albumId - 专辑ID
 * @param {object} data - 包含身份证号等信息的对象
 * @returns {Promise} - 返回生成结果的Promise
 */
export const generateAuthorizationFile = async (albumId, data) => {
  try {
    console.log('开始生成授权书，专辑ID:', albumId);
    console.log('授权书生成数据:', { idNumber: data.idNumber ? '已提供' : '未提供' });

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    // 先获取用户实名认证信息
    let userInfo = null;
    try {
      const userResponse = await axios.get(
        `${API_BASE_URL}/user-verification/current`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      userInfo = userResponse.data.verification;
      console.log('获取到用户实名信息:', { realName: userInfo.realName });
    } catch (userError) {
      console.error('获取用户实名信息失败:', userError);
      if (userError.response?.status === 404) {
        throw new Error('您需要先完成实名认证才能生成授权书');
      }
      throw userError;
    }

    // 调用后端API验证身份证号码
    try {
      const verifyResponse = await axios.post(
        `${API_BASE_URL}/albums/${albumId}/generate-authorization`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('身份证号码验证成功');
    } catch (verifyError) {
      console.error('身份证号码验证失败:', verifyError);
      if (verifyError.response?.data?.message) {
        throw new Error(verifyError.response.data.message);
      } else {
        throw new Error('身份证号码验证失败，请检查输入是否正确');
      }
    }

    // 获取专辑详情
    let album = null;
    try {
      const albumResponse = await axios.get(
        `${API_BASE_URL}/albums/${albumId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      album = albumResponse.data;
      console.log('获取到专辑信息:', { title: album.title });
    } catch (albumError) {
      console.error('获取专辑信息失败:', albumError);
      throw new Error('获取专辑信息失败，请稍后重试');
    }

    const authorInfo = {
      realName: userInfo.realName || '',
      idNumber: data.idNumber || ''
    };
    
    // 获取当前日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}年${month}月${day}日`;
    
    // 动态导入jsPDF库
    try {
      console.log('开始导入jsPDF');
      
      // 导入 jsPDF
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF; // 兼容不同打包方式
      if (!jsPDF || typeof jsPDF !== 'function') {
        console.error('jsPDF构造函数未正确加载:', jsPDF);
        throw new Error('无法获取jsPDF构造函数');
      }
      
      // 导入 jspdf-autotable
      await import('jspdf-autotable');
      console.log('jspdf-autotable 导入成功');

      // 创建PDF文档实例
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
      });
      
      // 确保jspdf-autotable插件已加载
      if (typeof doc.autoTable !== 'function') {
        console.error('jspdf-autotable插件未正确加载');
        throw new Error('jspdf-autotable插件未正确加载，请确保已安装该插件');
      }

      // 基本验证
      if (!doc || !doc.internal) {
        console.error('PDF实例创建失败:', doc);
        throw new Error('PDF实例创建失败');
      }

      // 设置文档属性
      doc.setProperties({
        title: '授权书',
        subject: '音乐作品授权',
        author: '极音记',
        keywords: '授权书,音乐,版权',
        creator: '极音记'
      });

      // 设置字体
      doc.setFont('helvetica', 'normal');

      // 加载中文字体
      try {
        // 使用 XMLHttpRequest 加载字体文件
        const loadFont = (url) => {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            
            xhr.onload = function() {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error(`字体加载失败: ${this.statusText}`));
              }
            };
            
            xhr.onerror = function() {
              reject(new Error('网络错误，字体加载失败'));
            };
            
            xhr.send();
          });
        };

        // 加载字体文件
        const normalFontBuffer = await loadFont('/fonts/HarmonyOS_Sans_SC_Light.ttf');
        const boldFontBuffer = await loadFont('/fonts/HarmonyOS_Sans_SC_Bold.ttf');

        // 将字体数据转换为base64
        const normalFontBase64 = arrayBufferToBase64(normalFontBuffer);
        const boldFontBase64 = arrayBufferToBase64(boldFontBuffer);

        // 添加字体到PDF
        try {
          // 添加常规字体
          doc.addFileToVFS('HarmonyOS_Sans_SC_Light.ttf', normalFontBase64);
          doc.addFont('HarmonyOS_Sans_SC_Light.ttf', 'HarmonyOS', 'normal');
          
          // 添加粗体字体
          doc.addFileToVFS('HarmonyOS_Sans_SC_Bold.ttf', boldFontBase64);
          doc.addFont('HarmonyOS_Sans_SC_Bold.ttf', 'HarmonyOS', 'bold');
          
          // 设置默认字体
          doc.setFont('HarmonyOS');
        } catch (fontError) {
          console.error('字体处理失败:', fontError);
          throw fontError;
        }
      } catch (fontLoadError) {
        console.error('字体加载失败:', fontLoadError);
        // 如果字体加载失败，使用默认字体
        doc.setFont('helvetica');
        console.warn('使用默认字体');
      }

      console.log('PDF文档初始化成功');

      // 定义页面尺寸和边距
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;

      console.log('页面参数:', { pageWidth, pageHeight, margin });

      // 创建表格数据
      const tableData = [];
      
      // 添加歌曲数据
      if (album.songs && album.songs.length > 0) {
        album.songs.forEach((song, index) => {
          const artistNames = song.Artists.map(a => a.name).join('、');
          const realNames = song.Artists.map(a => a.realName || a.name).join('、');
          
          tableData.push([
            (index + 1).toString(),
            album.title,
            song.title,
            artistNames,
            realNames,
            realNames,
            '100%',
            '100%',
            '100%'
          ]);
        });
      }

      console.log('表格数据准备完成');

      // 辅助函数：添加文本并自动换行
      function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
        // 确保使用中文字体
        doc.setFont('HarmonyOS', 'normal');
        const lines = doc.splitTextToSize(text, maxWidth);
        for (let i = 0; i < lines.length; i++) {
          doc.text(lines[i], x, y + (i * lineHeight));
        }
        return y + (lines.length * lineHeight);
      }

      // 辅助函数：添加章节
      function addSection(doc, title, content, startY, margin) {
        const pageWidth = doc.internal.pageSize.width;
        const contentWidth = pageWidth - 2 * margin;
        let currentY = startY;
        
        // 检查是否需要新页面
        if (currentY > doc.internal.pageSize.height - 50) {
          doc.addPage();
          currentY = margin;
        }
        
        // 添加标题
        doc.setFont('HarmonyOS', 'bold');
        doc.setFontSize(13);
        doc.text(title, margin, currentY);
        currentY += 8;
        
        // 恢复正文字体
        doc.setFont('HarmonyOS', 'normal');
        doc.setFontSize(11);
        
        // 添加内容段落
        for (const paragraph of content) {
          // 检查是否需要新页面
          if (currentY > doc.internal.pageSize.height - 40) {
            doc.addPage();
            currentY = margin;
          }
          
          // 添加段落文本并自动换行
          currentY = addWrappedText(doc, paragraph, margin, currentY, contentWidth);
          currentY += 5; // 段落间距
        }
        
        return currentY + 5; // 返回下一个内容的Y位置
      }

      // 标题
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(18);
      doc.text('授权书', pageWidth / 2, margin + 10, { align: 'center' });
      
      // 设置正文字体
      doc.setFont('HarmonyOS', 'normal');
      doc.setFontSize(11);
      
      // 当前Y位置
      let y = margin + 25;
      
      // 添加基本信息
      doc.text(`授权人：${authorInfo.realName || ''}`, margin, y);
      y += 10;
      doc.text(`授权人身份证号码：${authorInfo.idNumber || ''}`, margin, y);
      y += 10;
      doc.text(`被授权人：上海极音记文化科技有限公司`, margin, y);
      y += 15;
      
      // 第一章节
      const section1Content = [
        '1、授权人依据《中华人民共和国著作权法》的规定，将其作为合法权利人所享有的授权作品及全部下述权利专有许可被授权人（详见附件《授权作品及授权权利清单》）：（1）音乐词曲作品著作权之改编权、复制权、表演权、广播权和信息网络传播权等；（2）MV作品著作权之信息网络传播权和广播权；（3）录音/录像制品的词曲著作权和表演者权、录音制作者权、录像制作者权等邻接权之信息网络传播权、广播权及获酬权；以及（4）表演者权和录音制作者权之复制权。',
        '2、本授权书的信息网络传播权是指：以有线或者无线方式向公众提供或传播作品、录音及表演，包括交互式和非交互式。具体使用形式包括但不限于网络点播、下载、IPTV、数字电视、无线或有线增值业务等现有各种使用形式及授权期限内新出现的其他使用形式等，具体用户的接收终端和显示终端形式包括不限于手机、电脑、平板电脑、机顶盒、MPEG4播放器、车载电视、航空器电视等现有接收终端或显示终端及授权期限内新出现的其他接收终端或显示终端等。',
        '3、被授权人有权以自己的名义制止、打击侵权和盗版行为，包括但不限于申请证据保全、财产保全、行政投诉、刑事自诉、提起民事诉讼、上诉、申请执行、和解、获得赔偿金等（"维权"）。',
        '4、本授权书所称之盗版行为是指：在未获合法复制权、表演权和信息网络传播权授权的情况下，任何使用授权作品之行为。包括但不限于利用网络传播未获授权音乐作品的任何版本（如录音室版、现场演唱版、改变组曲和混音的衍生版等）之录音制品的行为。',
        '5、宣传推广授权：为宣传、推广授权作品之目的，授权人在此不可撤销地授予被授权人及其关联公司、合作方在授权期限内、于全世界范围内，无偿使用授权人及相关艺术家（包括但不限于表演者、词曲作者）的姓名（包括真实姓名、艺名、曾用名）、肖像、照片、形象、个人简介以及与授权作品相关的艺术作品（如专辑封面、宣传图）的权利。'
      ];
      y = addSection(doc, '一、授权作品及授权权利', section1Content, y, margin);
      
      // 第二章节
      const section2Content = [
        '1、本授权为独占性授权，即被授权人有权排除授权人及任何第三方使用上述授权作品。授权人在授权书生效期间不可将"【附件】极音记授权作品清单"内的作品授权其他第三方。除非事先获得被授权人的书面同意，否则授权方不得自行或允许第三方以任何形式使用授权作品。',
        '2、被授权人有权将全部授权作品及授权权利转授权给其关联公司及任何第三方使用。'
      ];
      y = addSection(doc, '二、授权性质', section2Content, y, margin);
      
      // 第三章节
      const section3Content = [
        '自本授权书签署日起，有效期五年。授权歌曲授权自提交日起，有效期五年。同等交易条件下，被授权人对授权人的授权作品拥有优先续约权，即授权人应优先与被授权人商谈续约事宜，该优先续约权并不影响授权方在授权期限届满后与任何第三方达成授权合作。授权期限届满后，基于双方约定的部分使用目的下，授权人将授权作品著作权之信息网络传播权和广播权永久非独占性授权被授权人按照授权协议的约定使用。如果授权人希望继续使用被授权人的平台或其他服务来推广和销售授权作品，双方应当就续签事宜提前至少6个月开始协商。'
      ];
      y = addSection(doc, '三、授权期限', section3Content, y, margin);
      
      // 第四章节
      const section4Content = ['全世界。'];
      y = addSection(doc, '四、授权范围', section4Content, y, margin);
      
      // 第五章节
      const section5Content = [
        '1.授权人如实填写"【附件】极音记授权作品清单"的所有相关信息，并保证该等信息的准确性和真实性。授权人可以将新作品的清单交付被授权人，授权人以被授权人指定的方式交付作品清单，视为对被授权人享有交付作品的专有权利的确认，双方默认指定的交付方式为E-mail：submit@acmetone.com',
        '2.授权人在向被授权人交付授权作品清单的同时，应交付清单所涉及的作品音频(或视频)介绍和相关资料，具体内容和要求见【发行物料格式示范】文件。',
        '3.如果授权人未能及时提供必要文件或信息导致的任何延误或损失，授权人自行承担因歌曲发行导致的问题责任。'
      ];
      y = addSection(doc, '五、授权作品交付', section5Content, y, margin);
      
      // 第六章节 - 费用、分成细则
      // 检查是否需要新页面
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(13);
      doc.text('六、费用、分成细则', margin, y);
      y += 8;
      
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(11);
      doc.text('1.费用', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      doc.setFontSize(11);
      const feeText = '被授权人应在协议有效期内按本协议约定的方式向授权方支付费用，该费用包括被授权人取得本次版权合作的需向授权人支付的全部费用，包括但不限于授权许可费用、诉讼赔偿金等。除此之外，被授权人无需向授权方支付任何其他费用。';
      y = addWrappedText(doc, feeText, margin, y, pageWidth - 2 * margin);
      y += 8;
      
      doc.setFont('HarmonyOS', 'bold');
      doc.text('2.费用计算方式', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      const feeCalcItems = [
        '(1) 商用授权使用作品获得的收益扣除被授权人运营成本的10%后为可分配收益，双方对可分配收益按照如下比例进行分配：授权方【70】%，被授权人【30】%',
        '(2) 被授权人通过第三方渠道（如QQ音乐、网易云音乐等）发行认领获得的版税收益分成，按照授权人【70】%，被授权人【30】%的标准向授权人进行结算。',
        '(3) 双方约定以人民币作为结算货币。',
        '(4) 双方同意每年结算4次，每次结算日固定为4月15日，7月15日，10月15日及1月15日，结算周期为三个月。被授权人应于每一个结算日的次月10个工作日前，向授权人提供授权作品的收益分配明细并与被授权人进行对账，授权人应在收到对账明细后15个工作日内进行确认。授权人在收到对账明细后15个工作日内未进行回复或提出异议，则视为确认该等账目。若本协议中约定的任何期限的最后一日恰逢法定节假日（包括周末及国家法定调休假日），则该期限应自动顺延至节假日结束后的第一个工作日。',
        '(5) 双方约定，若授权人收益分成未达到50元人民币，则仅通知，不予结算，转入下一次结算日。',
        '(6) 授权人应理解并同意，上述支付版税的前提是被授权人已经获得上游合作方的版税分成，因上游合作方未按时分成导致被授权人迟延履行支付版税义务的，不视作违约。'
      ];
      
      for (const item of feeCalcItems) {
        // 检查是否需要新页面
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        
        y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
        y += 5;
      }
      
      y += 4;
      doc.setFont('HarmonyOS', 'bold');
      doc.text('3.费用的支付', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      const paymentItems = [
        '(1) 授权人确认无异议或甲方确认后90个工作日内，向授权人账户支付费用。在未收到授权人提供的票据前，被授权人不承担付款义务，亦无需向授权人支付费用。',
        '(2) 如因授权人原因造成第三方追责给被授权人造成损失，或被授权人有合理理由相信即将造成损失，被授权人可暂停支付授权人费用，并优先从向授权人支付的费用获得赔偿。'
      ];
      
      for (const item of paymentItems) {
        // 检查是否需要新页面
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        
        y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
        y += 5;
      }
      
      y += 4;
      doc.setFont('HarmonyOS', 'bold');
      doc.text('4. 税务处理', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      const taxItems = [
        '(1) 税费承担与代扣代缴：双方确认，本协议项下被授权人（上海极音记文化科技有限公司）向授权人支付的任何费用均为税前金额。被授权人有权并有义务根据《中华人民共和国个人所得税法》、《中华人民共和国税收征收管理法》及相关法规的规定，在支付前代为扣缴授权人应承担的全部税费（包括但不限于个人所得税）。授权人实际收到的结算金额为扣除所有应缴税费后的净额。',
        '(2) 信息提供与保证义务：授权人必须向被授权人提供真实、准确、完整且有效的身份信息和税务信息（包括但不限于姓名、身份证号码、银行账户信息等），以供被授权人履行税务申报及代扣代缴义务。授权人保证其所提供信息在整个授权期限内持续有效。',
        [ // item (3)
          '(3) 风险责任承担：如因授权人提供的信息错误、过时、不完整或具有误导性，或因授权人自身的税务状况（如税务居民身份变更）未及时通知被授权人，而导致：',
          '_INDENT_a) 被授权人无法正确履行代扣代缴义务；',
          '_INDENT_b) 被授权人受到税务机关的任何形式的调查、处罚、罚款或被要求补缴/滞纳税款；',
          '_INDENT_c) 给被授权人造成任何其他损失的。',
          '则全部责任、后果及由此产生的全部费用（包括但不限于罚款、滞纳金、律师费、补缴税款等）均由授权人承担。'
        ],
        '(4) 直接抵扣权：在发生上述(3)款所述情形时，被授权人有权将授权人应承担的全部费用直接从任何应付给授权人的款项中抵扣，并保留进一步追偿的权利。此举不构成被授权人违约。',
        '(5) 发票：若授权人有资格并选择开具增值税发票，应在每次结算确认后向被授权人提供合法有效的等额发票。被授权人将在收到合规发票后启动付款流程。'
      ];
      
      const indentSize = 5; // 5mm indent
      const prefix = '_INDENT_';

      for (const item of taxItems) {
        // 检查是否需要新页面
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }

        if (Array.isArray(item)) {
          // Handle item (3) with its sub-parts
          for (let i = 0; i < item.length; i++) {
            const subItem = item[i];
            const isIndented = subItem.startsWith(prefix);
            const currentMargin = isIndented ? margin + indentSize : margin;
            const textToRender = isIndented ? subItem.substring(prefix.length) : subItem;
            const maxWidth = pageWidth - 2 * margin - (isIndented ? indentSize : 0);

            if (i > 0 && y > pageHeight - 40) { // check for page break for sub-items
                doc.addPage();
                y = margin;
            }
            y = addWrappedText(doc, textToRender, currentMargin, y, maxWidth);
            
            if (i < item.length - 1) {
              y += 2; // small gap between sub-items
            }
          }
        } else {
          y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
        }
        y += 5;
      }
      
      // 第七章节
      const section7Content = [
        '(1) 保密条款：规定双方应对本协议内容及因履行本协议而知悉的对方商业秘密负有保密义务。',
        '(2) 法律适用与争议解决：本授权书的订立、效力、解释、履行及争议的解决均适用中华人民共和国大陆地区法律。任何因本授权书引起的或与本授权书有关的争议，双方应首先尝试通过友好协商解决；若协商不成，任一方均有权依据《中华人民共和国民事诉讼法》的规定，将争议提交至被授权人所在地有管辖权的人民法院通过诉讼方式解决。',
        '(3) 作品完整权：为使被授权人能充分、有效地行使本授权书项下的各项权利，授权人同意，在法律允许的最大范围内，被授权人可为技术或商业推广之需，对授权作品进行必要的编辑、截取或改编（例如制作铃声、片段用于短视频等），授权人承诺不对此主张保护作品完整权等著作人身权。',
        '(4) 根本违约与合同解除：授权人若违反其在本授权书第八条（授权人的承诺与保证）中所作的任何实质性保证，或提供的文件、信息存在虚假、误导，则视为《中华人民共和国民法典》所规定的根本性违约。在此情况下，被授权人有权依据《中华人民共和国民法典》关于合同解除的相关规定，单方面立即书面通知授权人终止本协议，而无需承担任何责任，并有权要求授权人赔偿因此造成的一切损失。'
      ];
      y = addSection(doc, '七、补充条款', section7Content, y, margin);
      
      // 第八章节
      const section8Content = [
        '授权人在此作出以下不可撤销的、构成其核心合同义务的承诺与保证，并确认如违反以下任何条款，将依据《中华人民共和国民法典》、《中华人民共和国著作权法》等相关法律法规承担全部法律责任：',
        '1. 权利来源保证: 授权人保证，就本授权书所涉全部授权作品，其拥有独立、完整、无争议的合法权利。若授权人非原始权利人，其保证已从原始权利人处获得了充分、有效、不可撤销的、可进行转授权的（sublicensable）书面授权，确保其有权依据本授权书的条款向被授权人（上海极音记文化科技有限公司）进行再授权。',
        '2. 权利证明义务: 应被授权人请求，授权人有义务提供相关权利证明文件，包括但不限于与原始权利人签署的授权协议、权利证书等，以兹证明其权利的合法性与完整性。若授权人未能提供或提供的文件不足以证明其权利，被授权人有权中止合作并暂停支付任何费用，直至授权人提供有效证明为止。',
        '3. 元数据及信息准确性保证：授权人保证其向被授权人提供的所有信息、元数据（Metadata）及相关材料，包括但不限于本协议附件、歌曲标题、表演者信息、以及词曲作者的真实姓名（法定姓名），均是真实、准确、完整且无误导性的。授权人将对因该等信息不准确或虚假而引起的一切后果承担全部责任。',
        '4. 无侵权保证: 授权人保证授权作品的内容、材料以及授权人行使和履行本授权书项下权利和义务的行为，不侵犯任何第三方的合法权益（包括但不限于著作权、商标权、表演者权、肖像权、隐私权等）。',
        '5. 责任承担: 若因授权人违反上述任何保证（尤其是因授权链条不完整、权利瑕疵或内容侵权等问题），导致被授权人或其关联公司、合作方面临任何形式的索赔、诉讼或行政处罚，授权人应承担由此引发的全部法律责任。授权人应主动出面与第三方进行交涉，并承担所有为解决争议而产生的费用。',
        '6. 损失赔偿: 在发生上述第5点所述情形时，授权人同意赔偿被授权人及其关联公司、合作方因此遭受的全部直接和间接损失。该等损失包括但不限于：向第三方支付的赔偿金/和解金、行政罚款、合理的律师费、诉讼费、公证鉴定费及其他所有维权开支。被授权人有权从任何应支付给授权人的款项（包括但不限于版税分成）中直接抵扣上述损失，不足部分有权继续追偿。',
        '7. 最终确认: 授权人确认，其在签署本授权书前已仔细阅读并完全理解所有条款的含义及法律后果，并自愿接受其约束。本授权书的签署代表授权人对其所作保证的正式确认。',
        '8. 费用暂扣权: 若发生或被授权人有合理理由怀疑可能发生任何违反本授权书保证的情形，或出现任何第三方主张权利，被授权人有权立即暂停支付应付给授权人的任何费用（包括但不限于版税分成），直至争议完全解决且授权人提供令被授权人满意的权利证明为止。此举不构成被授权人违约，授权人亦无权就此主张任何利息或赔偿。',
        '9. 信赖原则与免责声明: 授权人确认并同意，被授权人是基于对授权人在本协议中所作承诺与保证的完全信赖，而接受授权并进行后续的作品分发、推广等活动。被授权人没有义务对授权作品的权利状态进行独立的调查或核实。 即使被授权人进行了部分核查，也不代表其承担了核查义务，更不减轻授权人在本协议项下的任何保证责任。授权人自愿承担因其虚假承诺或侵权行为所引发的一切法律后果。'
      ];
      y = addSection(doc, '八、授权人的承诺与保证', section8Content, y, margin);
      
      // 添加签名区域
      // 检查是否需要新页面
      if (y > pageHeight - 90) { // Increased space for longer signature clause
        doc.addPage();
        y = margin;
      } else {
        y += 15;
      }
      
      const signatureClause = '本授权书可通过手写签名或符合《中华人民共和国电子签名法》规定的可靠电子签名形式（包括但不限于通过上海"一网通办"平台等政府认可的第三方数字证书服务机构生成的数字签名）签署，二者具有同等法律效力。若选择手写签名，授权人应打印本授权书一式两份并签名，邮寄至被授权人所在地：陕西省西安市长安区西北工业大学长安校区。如果被授权人通知了其他地址，则按其最新通知的地址邮寄。被授权人签署/盖章完成后，将沿原路寄回其中一份。授权人采用电子签名形式签署的，即视为其确认该签名为其本人真实意愿的表示并由其本人操作。无论采用何种方式，授权人均需保证其签名的真实性与有效性。因电子签名或手写签名无效、虚假或非本人使用所产生的一切法律责任，均由授权人自行承担。';
      y = addWrappedText(doc, signatureClause, margin, y, pageWidth - 2 * margin);
      y += 10;

      // 确保使用中文字体
      doc.setFont('HarmonyOS', 'normal');
      
      doc.text('授权人签名：', margin, y);
      doc.text('被授权人签名（印章）：', pageWidth - margin - 60, y);
      
      y += 25;
      doc.text(`日期：${dateString}`, margin, y);
      doc.text(`日期：${dateString}`, pageWidth - margin - 60, y);
      
      // 添加授权作品清单页面
      doc.addPage();
      
      // 标题
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(16);
      doc.text('【附件】极音记授权作品清单', pageWidth / 2, margin, { align: 'center' });
      
      // 表头
      const headers = [
        '序号', '专辑名称', '音乐名称', '表演者名称', '词作者', '曲作者', 
        '词曲权利比例', '表演者权利比例', '录音制作者权利比例'
      ];
      
      // 绘制表格
      function drawTable(doc, data, headers, startY, margin) {
        const pageWidth = doc.internal.pageSize.width;
        const contentWidth = pageWidth - 2 * margin;
        
        // 使用jspdf-autotable插件创建表格
        doc.autoTable({
          startY: startY,
          head: [headers],
          body: data,
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.05 }, // 序号
            1: { cellWidth: contentWidth * 0.12 }, // 专辑名称
            2: { cellWidth: contentWidth * 0.12 }, // 音乐名称
            3: { cellWidth: contentWidth * 0.15 }, // 表演者名称
            4: { cellWidth: contentWidth * 0.11 }, // 词作者
            5: { cellWidth: contentWidth * 0.11 }, // 曲作者
            6: { cellWidth: contentWidth * 0.11 }, // 词曲权利比例
            7: { cellWidth: contentWidth * 0.11 }, // 表演者权利比例
            8: { cellWidth: contentWidth * 0.12 }  // 录音制作者权利比例
          },
          headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          bodyStyles: {
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          styles: {
            font: 'HarmonyOS',
            overflow: 'linebreak', // 确保文本自动换行
            cellWidth: 'wrap',     // 自动调整单元格宽度
            minCellHeight: 10,     // 最小单元格高度
            cellPadding: 3         // 单元格内边距，增加这个值可以提供更多空间
          },
          willDrawCell: function(data) {
            // 可以在这里自定义单元格绘制
            if (data.section === 'body') {
              // 对于表格内容，不限制行高
              data.cell.styles.minCellHeight = Math.max(10, data.cell.height);
            }
          },
          didParseCell: function(data) {
            // 在单元格解析后调整样式
            if (data.section === 'body') {
              data.cell.styles.overflow = 'linebreak';
              data.cell.styles.cellPadding = 3;
            }
          }
        });
        
        // 返回表格结束的Y坐标
        return doc.lastAutoTable.finalY;
      }

      // 绘制表格
      y = drawTable(doc, tableData, headers, margin + 15, margin);
      
      // 保存PDF文件，触发浏览器下载
      try {
        console.log('准备生成并下载PDF文件');
        const fileName = `授权书_${album.title}_${dateString}.pdf`;
        
        // 直接使用save方法下载PDF，这样可以避免blob操作可能导致的问题
        doc.save(fileName);
        
        console.log('授权书生成和上传成功');
        return { success: true, message: '授权书生成和上传成功' };
      } catch (saveError) {
        console.error('保存PDF文件失败:', saveError);
        throw new Error('保存授权书失败，请稍后重试: ' + saveError.message);
      }
    } catch (importError) {
      console.error('导入jsPDF或autoTable插件失败:', importError);
      throw new Error('PDF生成组件加载失败，请刷新页面重试');
    }
  } catch (error) {
    console.error('生成授权书错误:', error);
    throw error.response?.data?.message || error.message || '生成授权书失败';
  }
};

/**
 * 上传授权书文件
 * @param {number} albumId - 专辑ID
 * @param {FormData} formData - 包含授权书文件的FormData对象
 * @returns {Promise} - 返回上传结果的Promise
 */
export const uploadAuthorizationFile = async (albumId, formData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    const response = await axios.post(
      `${API_BASE_URL}/albums/${albumId}/authorization`,
      formData,
      {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('上传授权书错误:', error);
    throw error.response?.data?.message || '上传授权书失败';
  }
};

/**
 * 下载授权书文件
 * @param {number} albumId - 专辑ID
 * @returns {Promise} - 返回下载结果的Promise
 */
export const downloadAuthorizationFile = async (albumId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    const response = await axios.get(
      `${API_BASE_URL}/albums/${albumId}/authorization`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      }
    );
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // 设置下载文件名
    link.setAttribute('download', `授权书-${albumId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return response.data;
  } catch (error) {
    console.error('下载授权书错误:', error);
    throw error.response?.data?.message || '下载授权书失败';
  }
};

/**
 * 删除授权书文件
 * @param {number} albumId - 专辑ID
 * @returns {Promise} - 返回删除结果的Promise
 */
export const deleteAuthorizationFile = async (albumId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    const response = await axios.delete(
      `${API_BASE_URL}/albums/${albumId}/authorization`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('删除授权书错误:', error);
    throw error.response?.data?.message || '删除授权书失败';
  }
};

/**
 * 生成临时授权书文件（不上传到服务器，只下载）
 * @param {number} albumId - 专辑ID
 * @param {object} data - 包含身份证号等信息的对象
 * @returns {Promise} - 返回生成结果的Promise
 */
export const generateTempAuthorizationFile = async (albumId, data) => {
  try {
    console.log('开始生成临时授权书，专辑ID:', albumId);
    console.log('临时授权书生成数据:', { 
      idNumber: data.idNumber ? '已提供' : '未提供',
      realName: data.realName ? '已提供' : '未提供',
      realNameValue: data.realName // 记录真实姓名值，方便调试
    });

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    // 调用后端API验证身份证号码
    try {
      console.log('调用后端API验证身份证号码...');
      const response = await axios({
        method: 'post',
        url: `${API_BASE_URL}/albums/${albumId}/generate-temp-authorization`,
        data: {
          idNumber: data.idNumber,
          realName: data.realName
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('身份证号码验证成功，API响应:', response.data);
      
      // 获取用户信息和专辑信息
      const { userInfo, albumInfo } = response.data;
      
      console.log('API返回的用户信息:', userInfo);
      console.log('API返回的专辑信息:', albumInfo);
      
      // 验证API返回的用户信息是否包含真实姓名
      if (!userInfo || !userInfo.realName) {
        console.error('API返回的用户信息中没有真实姓名');
        throw new Error('无法获取您的实名信息，请联系客服处理');
      }

      // 获取专辑详情
      const albumResponse = await axios.get(
        `${API_BASE_URL}/albums/${albumId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const album = albumResponse.data;
      const songs = album.songs || [];
      
      // 获取当前日期
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}年${month}月${day}日`;

      // 动态导入jsPDF库
      try {
        console.log('开始导入jsPDF');
        
        // 导入 jsPDF
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF; // 兼容不同打包方式
        if (!jsPDF || typeof jsPDF !== 'function') {
          console.error('jsPDF构造函数未正确加载:', jsPDF);
          throw new Error('无法获取jsPDF构造函数');
        }
        
        // 导入 jspdf-autotable
        await import('jspdf-autotable');
        console.log('jspdf-autotable 导入成功');

        // 创建PDF文档实例
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          putOnlyUsedFonts: true
        });
        
        // 确保jspdf-autotable插件已加载
        if (typeof doc.autoTable !== 'function') {
          console.error('jspdf-autotable插件未正确加载');
          throw new Error('jspdf-autotable插件未正确加载，请确保已安装该插件');
        }

        // 基本验证
        if (!doc || !doc.internal) {
          console.error('PDF实例创建失败:', doc);
          throw new Error('PDF实例创建失败');
        }

        // 设置文档属性
        doc.setProperties({
          title: '授权书',
          subject: '音乐作品授权',
          author: '极音记',
          keywords: '授权书,音乐,版权',
          creator: '极音记'
        });

        // 加载中文字体
        await loadFonts(doc);

        console.log('PDF文档初始化成功');

        // 定义页面尺寸和边距
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;

        console.log('页面参数:', { pageWidth, pageHeight, margin });

        // 创建表格数据
        const tableData = [];
        
        // 添加歌曲数据
        if (album.songs && album.songs.length > 0) {
          album.songs.forEach((song, index) => {
            const artistNames = song.Artists.map(a => a.name).join('、');
            const realNames = song.Artists.map(a => a.realName || a.name).join('、');
            
            tableData.push([
              (index + 1).toString(),
              album.title,
              song.title,
              artistNames,
              realNames,
              realNames,
              '100%',
              '100%',
              '100%'
            ]);
          });
        }

        console.log('表格数据准备完成');

        // 辅助函数：添加文本并自动换行
        function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
          // 确保使用中文字体
          doc.setFont('HarmonyOS', 'normal');
          const lines = doc.splitTextToSize(text, maxWidth);
          for (let i = 0; i < lines.length; i++) {
            doc.text(lines[i], x, y + (i * lineHeight));
          }
          return y + (lines.length * lineHeight);
        }

        // 辅助函数：添加章节
        function addSection(doc, title, content, startY, margin) {
          const pageWidth = doc.internal.pageSize.width;
          const contentWidth = pageWidth - 2 * margin;
          let currentY = startY;
          
          // 检查是否需要新页面
          if (currentY > doc.internal.pageSize.height - 50) {
            doc.addPage();
            currentY = margin;
          }
          
          // 添加标题
          doc.setFont('HarmonyOS', 'bold');
          doc.setFontSize(13);
          doc.text(title, margin, currentY);
          currentY += 8;
          
          // 恢复正文字体
          doc.setFont('HarmonyOS', 'normal');
          doc.setFontSize(11);
          
          // 添加内容段落
          for (const paragraph of content) {
            // 检查是否需要新页面
            if (currentY > doc.internal.pageSize.height - 40) {
              doc.addPage();
              currentY = margin;
            }
            
            // 添加段落文本并自动换行
            currentY = addWrappedText(doc, paragraph, margin, currentY, contentWidth);
            currentY += 5; // 段落间距
          }
          
          return currentY + 5; // 返回下一个内容的Y位置
        }

        // 标题
        doc.setFont('HarmonyOS', 'bold');
        doc.setFontSize(18);
        doc.text('授权书', pageWidth / 2, margin + 10, { align: 'center' });
        
        // 设置正文字体
        doc.setFont('HarmonyOS', 'normal');
        doc.setFontSize(11);
        
        // 当前Y位置
        let y = margin + 25;
        
        // 添加基本信息
        doc.text(`授权人：${userInfo.realName || ''}`, margin, y);
        y += 10;
        doc.text(`授权人身份证号码：${userInfo.idNumber || ''}`, margin, y);
        y += 10;
        doc.text(`被授权人：上海极音记文化科技有限公司`, margin, y);
        y += 15;
        
        // 第一章节
        const section1Content = [
          '1、授权人依据《中华人民共和国著作权法》的规定，将其作为合法权利人所享有的授权作品及全部下述权利专有许可被授权人（详见附件《授权作品及授权权利清单》）：（1）音乐词曲作品著作权之改编权、复制权、表演权、广播权和信息网络传播权等；（2）MV作品著作权之信息网络传播权和广播权；（3）录音/录像制品的词曲著作权和表演者权、录音制作者权、录像制作者权等邻接权之信息网络传播权、广播权及获酬权；以及（4）表演者权和录音制作者权之复制权。',
          '2、本授权书的信息网络传播权是指：以有线或者无线方式向公众提供或传播作品、录音及表演，包括交互式和非交互式。具体使用形式包括但不限于网络点播、下载、IPTV、数字电视、无线或有线增值业务等现有各种使用形式及授权期限内新出现的其他使用形式等，具体用户的接收终端和显示终端形式包括不限于手机、电脑、平板电脑、机顶盒、MPEG4播放器、车载电视、航空器电视等现有接收终端或显示终端及授权期限内新出现的其他接收终端或显示终端等。',
          '3、被授权人有权以自己的名义制止、打击侵权和盗版行为，包括但不限于申请证据保全、财产保全、行政投诉、刑事自诉、提起民事诉讼、上诉、申请执行、和解、获得赔偿金等（"维权"）。',
          '4、本授权书所称之盗版行为是指：在未获合法复制权、表演权和信息网络传播权授权的情况下，任何使用授权作品之行为。包括但不限于利用网络传播未获授权音乐作品的任何版本（如录音室版、现场演唱版、改变组曲和混音的衍生版等）之录音制品的行为。',
          '5、宣传推广授权：为宣传、推广授权作品之目的，授权人在此不可撤销地授予被授权人及其关联公司、合作方在授权期限内、于全世界范围内，无偿使用授权人及相关艺术家（包括但不限于表演者、词曲作者）的姓名（包括真实姓名、艺名、曾用名）、肖像、照片、形象、个人简介以及与授权作品相关的艺术作品（如专辑封面、宣传图）的权利。'
        ];
        y = addSection(doc, '一、授权作品及授权权利', section1Content, y, margin);
        
        // 第二章节
        const section2Content = [
          '1、本授权为独占性授权，即被授权人有权排除授权人及任何第三方使用上述授权作品。授权人在授权书生效期间不可将"【附件】极音记授权作品清单"内的作品授权其他第三方。除非事先获得被授权人的书面同意，否则授权方不得自行或允许第三方以任何形式使用授权作品。',
          '2、被授权人有权将全部授权作品及授权权利转授权给其关联公司及任何第三方使用。'
        ];
        y = addSection(doc, '二、授权性质', section2Content, y, margin);
        
        // 第三章节
        const section3Content = [
          '自本授权书签署日起，有效期五年。授权歌曲授权自提交日起，有效期五年。同等交易条件下，被授权人对授权人的授权作品拥有优先续约权，即授权人应优先与被授权人商谈续约事宜，该优先续约权并不影响授权方在授权期限届满后与任何第三方达成授权合作。授权期限届满后，基于双方约定的部分使用目的下，授权人将授权作品著作权之信息网络传播权和广播权永久非独占性授权被授权人按照授权协议的约定使用。如果授权人希望继续使用被授权人的平台或其他服务来推广和销售授权作品，双方应当就续签事宜提前至少6个月开始协商。'
        ];
        y = addSection(doc, '三、授权期限', section3Content, y, margin);
        
        // 第四章节
        const section4Content = ['全世界。'];
        y = addSection(doc, '四、授权范围', section4Content, y, margin);
        
        // 第五章节
        const section5Content = [
          '1.授权人如实填写"【附件】极音记授权作品清单"的所有相关信息，并保证该等信息的准确性和真实性。授权人可以将新作品的清单交付被授权人，授权人以被授权人指定的方式交付作品清单，视为对被授权人享有交付作品的专有权利的确认，双方默认指定的交付方式为E-mail：submit@acmetone.com',
          '2.授权人在向被授权人交付授权作品清单的同时，应交付清单所涉及的作品音频(或视频)介绍和相关资料，具体内容和要求见【发行物料格式示范】文件。',
          '3.如果授权人未能及时提供必要文件或信息导致的任何延误或损失，授权人自行承担因歌曲发行导致的问题责任。'
        ];
        y = addSection(doc, '五、授权作品交付', section5Content, y, margin);
        
        // 第六章节 - 费用、分成细则
        // 检查是否需要新页面
        if (y > pageHeight - 60) {
          doc.addPage();
          y = margin;
        }
        
        doc.setFont('HarmonyOS', 'bold');
        doc.setFontSize(13);
        doc.text('六、费用、分成细则', margin, y);
        y += 8;
        
        doc.setFont('HarmonyOS', 'bold');
        doc.setFontSize(11);
        doc.text('1.费用', margin, y);
        y += 6;
        
        doc.setFont('HarmonyOS', 'normal');
        doc.setFontSize(11);
        const feeText = '被授权人应在协议有效期内按本协议约定的方式向授权方支付费用，该费用包括被授权人取得本次版权合作的需向授权人支付的全部费用，包括但不限于授权许可费用、诉讼赔偿金等。除此之外，被授权人无需向授权方支付任何其他费用。';
        y = addWrappedText(doc, feeText, margin, y, pageWidth - 2 * margin);
        y += 8;
        
        doc.setFont('HarmonyOS', 'bold');
        doc.text('2.费用计算方式', margin, y);
        y += 6;
        
        doc.setFont('HarmonyOS', 'normal');
        const feeCalcItems = [
          '(1) 商用授权使用作品获得的收益扣除被授权人运营成本的10%后为可分配收益，双方对可分配收益按照如下比例进行分配：授权方【70】%，被授权人【30】%',
          '(2) 被授权人通过第三方渠道（如QQ音乐、网易云音乐等）发行认领获得的版税收益分成，按照授权人【70】%，被授权人【30】%的标准向授权人进行结算。',
          '(3) 双方约定以人民币作为结算货币。',
          '(4) 双方同意每年结算4次，每次结算日固定为4月15日，7月15日，10月15日及1月15日，结算周期为三个月。被授权人应于每一个结算日的次月10个工作日前，向授权人提供授权作品的收益分配明细并与被授权人进行对账，授权人应在收到对账明细后15个工作日内进行确认。授权人在收到对账明细后15个工作日内未进行回复或提出异议，则视为确认该等账目。若本协议中约定的任何期限的最后一日恰逢法定节假日（包括周末及国家法定调休假日），则该期限应自动顺延至节假日结束后的第一个工作日。',
          '(5) 双方约定，若授权人收益分成未达到50元人民币，则仅通知，不予结算，转入下一次结算日。',
          '(6) 授权人应理解并同意，上述支付版税的前提是被授权人已经获得上游合作方的版税分成，因上游合作方未按时分成导致被授权人迟延履行支付版税义务的，不视作违约。'
        ];
        
        for (const item of feeCalcItems) {
          // 检查是否需要新页面
          if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
          }
          
          y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
          y += 5;
        }
        
        y += 4;
        doc.setFont('HarmonyOS', 'bold');
        doc.text('3.费用的支付', margin, y);
        y += 6;
        
        doc.setFont('HarmonyOS', 'normal');
        const paymentItems = [
          '(1) 授权人确认无异议或甲方确认后90个工作日内，向授权人账户支付费用。在未收到授权人提供的票据前，被授权人不承担付款义务，亦无需向授权人支付费用。',
          '(2) 如因授权人原因造成第三方追责给被授权人造成损失，或被授权人有合理理由相信即将造成损失，被授权人可暂停支付授权人费用，并优先从向授权人支付的费用获得赔偿。'
        ];
        
        for (const item of paymentItems) {
          // 检查是否需要新页面
          if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
          }
          
          y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
          y += 5;
        }
        
        y += 4;
        doc.setFont('HarmonyOS', 'bold');
        doc.text('4. 税务处理', margin, y);
        y += 6;
        
        doc.setFont('HarmonyOS', 'normal');
        const taxItems = [
          '(1) 税费承担与代扣代缴：双方确认，本协议项下被授权人（上海极音记文化科技有限公司）向授权人支付的任何费用均为税前金额。被授权人有权并有义务根据《中华人民共和国个人所得税法》、《中华人民共和国税收征收管理法》及相关法规的规定，在支付前代为扣缴授权人应承担的全部税费（包括但不限于个人所得税）。授权人实际收到的结算金额为扣除所有应缴税费后的净额。',
          '(2) 信息提供与保证义务：授权人必须向被授权人提供真实、准确、完整且有效的身份信息和税务信息（包括但不限于姓名、身份证号码、银行账户信息等），以供被授权人履行税务申报及代扣代缴义务。授权人保证其所提供信息在整个授权期限内持续有效。',
          [ // item (3)
            '(3) 风险责任承担：如因授权人提供的信息错误、过时、不完整或具有误导性，或因授权人自身的税务状况（如税务居民身份变更）未及时通知被授权人，而导致：',
            '_INDENT_a) 被授权人无法正确履行代扣代缴义务；',
            '_INDENT_b) 被授权人受到税务机关的任何形式的调查、处罚、罚款或被要求补缴/滞纳税款；',
            '_INDENT_c) 给被授权人造成任何其他损失的。',
            '则全部责任、后果及由此产生的全部费用（包括但不限于罚款、滞纳金、律师费、补缴税款等）均由授权人承担。'
          ],
          '(4) 直接抵扣权：在发生上述(3)款所述情形时，被授权人有权将授权人应承担的全部费用直接从任何应付给授权人的款项中抵扣，并保留进一步追偿的权利。此举不构成被授权人违约。',
          '(5) 发票：若授权人有资格并选择开具增值税发票，应在每次结算确认后向被授权人提供合法有效的等额发票。被授权人将在收到合规发票后启动付款流程。'
        ];
        
        const indentSize = 5; // 5mm indent
        const prefix = '_INDENT_';

        for (const item of taxItems) {
          // 检查是否需要新页面
          if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
          }

          if (Array.isArray(item)) {
            // Handle item (3) with its sub-parts
            for (let i = 0; i < item.length; i++) {
              const subItem = item[i];
              const isIndented = subItem.startsWith(prefix);
              const currentMargin = isIndented ? margin + indentSize : margin;
              const textToRender = isIndented ? subItem.substring(prefix.length) : subItem;
              const maxWidth = pageWidth - 2 * margin - (isIndented ? indentSize : 0);

              if (i > 0 && y > pageHeight - 40) { // check for page break for sub-items
                  doc.addPage();
                  y = margin;
              }
              y = addWrappedText(doc, textToRender, currentMargin, y, maxWidth);
              
              if (i < item.length - 1) {
                y += 2; // small gap between sub-items
              }
            }
          } else {
            y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
          }
          y += 5;
        }
        
        // 第七章节
        const section7Content = [
          '(1) 保密条款：规定双方应对本协议内容及因履行本协议而知悉的对方商业秘密负有保密义务。',
          '(2) 法律适用与争议解决：本授权书的订立、效力、解释、履行及争议的解决均适用中华人民共和国大陆地区法律。任何因本授权书引起的或与本授权书有关的争议，双方应首先尝试通过友好协商解决；若协商不成，任一方均有权依据《中华人民共和国民事诉讼法》的规定，将争议提交至被授权人所在地有管辖权的人民法院通过诉讼方式解决。',
          '(3) 作品完整权：为使被授权人能充分、有效地行使本授权书项下的各项权利，授权人同意，在法律允许的最大范围内，被授权人可为技术或商业推广之需，对授权作品进行必要的编辑、截取或改编（例如制作铃声、片段用于短视频等），授权人承诺不对此主张保护作品完整权等著作人身权。',
          '(4) 根本违约与合同解除：授权人若违反其在本授权书第八条（授权人的承诺与保证）中所作的任何实质性保证，或提供的文件、信息存在虚假、误导，则视为《中华人民共和国民法典》所规定的根本性违约。在此情况下，被授权人有权依据《中华人民共和国民法典》关于合同解除的相关规定，单方面立即书面通知授权人终止本协议，而无需承担任何责任，并有权要求授权人赔偿因此造成的一切损失。'
        ];
        y = addSection(doc, '七、补充条款', section7Content, y, margin);
        
        // 第八章节
        const section8Content = [
          '授权人在此作出以下不可撤销的、构成其核心合同义务的承诺与保证，并确认如违反以下任何条款，将依据《中华人民共和国民法典》、《中华人民共和国著作权法》等相关法律法规承担全部法律责任：',
          '1. 权利来源保证: 授权人保证，就本授权书所涉全部授权作品，其拥有独立、完整、无争议的合法权利。若授权人非原始权利人，其保证已从原始权利人处获得了充分、有效、不可撤销的、可进行转授权的（sublicensable）书面授权，确保其有权依据本授权书的条款向被授权人（上海极音记文化科技有限公司）进行再授权。',
          '2. 权利证明义务: 应被授权人请求，授权人有义务提供相关权利证明文件，包括但不限于与原始权利人签署的授权协议、权利证书等，以兹证明其权利的合法性与完整性。若授权人未能提供或提供的文件不足以证明其权利，被授权人有权中止合作并暂停支付任何费用，直至授权人提供有效证明为止。',
          '3. 元数据及信息准确性保证：授权人保证其向被授权人提供的所有信息、元数据（Metadata）及相关材料，包括但不限于本协议附件、歌曲标题、表演者信息、以及词曲作者的真实姓名（法定姓名），均是真实、准确、完整且无误导性的。授权人将对因该等信息不准确或虚假而引起的一切后果承担全部责任。',
          '4. 无侵权保证: 授权人保证授权作品的内容、材料以及授权人行使和履行本授权书项下权利和义务的行为，不侵犯任何第三方的合法权益（包括但不限于著作权、商标权、表演者权、肖像权、隐私权等）。',
          '5. 责任承担: 若因授权人违反上述任何保证（尤其是因授权链条不完整、权利瑕疵或内容侵权等问题），导致被授权人或其关联公司、合作方面临任何形式的索赔、诉讼或行政处罚，授权人应承担由此引发的全部法律责任。授权人应主动出面与第三方进行交涉，并承担所有为解决争议而产生的费用。',
          '6. 损失赔偿: 在发生上述第5点所述情形时，授权人同意赔偿被授权人及其关联公司、合作方因此遭受的全部直接和间接损失。该等损失包括但不限于：向第三方支付的赔偿金/和解金、行政罚款、合理的律师费、诉讼费、公证鉴定费及其他所有维权开支。被授权人有权从任何应支付给授权人的款项（包括但不限于版税分成）中直接抵扣上述损失，不足部分有权继续追偿。',
          '7. 最终确认: 授权人确认，其在签署本授权书前已仔细阅读并完全理解所有条款的含义及法律后果，并自愿接受其约束。本授权书的签署代表授权人对其所作保证的正式确认。',
          '8. 费用暂扣权: 若发生或被授权人有合理理由怀疑可能发生任何违反本授权书保证的情形，或出现任何第三方主张权利，被授权人有权立即暂停支付应付给授权人的任何费用（包括但不限于版税分成），直至争议完全解决且授权人提供令被授权人满意的权利证明为止。此举不构成被授权人违约，授权人亦无权就此主张任何利息或赔偿。',
          '9. 信赖原则与免责声明: 授权人确认并同意，被授权人是基于对授权人在本协议中所作承诺与保证的完全信赖，而接受授权并进行后续的作品分发、推广等活动。被授权人没有义务对授权作品的权利状态进行独立的调查或核实。 即使被授权人进行了部分核查，也不代表其承担了核查义务，更不减轻授权人在本协议项下的任何保证责任。授权人自愿承担因其虚假承诺或侵权行为所引发的一切法律后果。'
        ];
        y = addSection(doc, '八、授权人的承诺与保证', section8Content, y, margin);
        
        // 添加签名区域
        // 检查是否需要新页面
        if (y > pageHeight - 90) { // Increased space for longer signature clause
          doc.addPage();
          y = margin;
        } else {
          y += 15;
        }
        
        const signatureClause = '本授权书可通过手写签名或符合《中华人民共和国电子签名法》规定的可靠电子签名形式（包括但不限于通过上海"一网通办"平台等政府认可的第三方数字证书服务机构生成的数字签名）签署，二者具有同等法律效力。若选择手写签名，授权人应打印本授权书一式两份并签名，邮寄至被授权人所在地：陕西省西安市长安区西北工业大学长安校区。如果被授权人通知了其他地址，则按其最新通知的地址邮寄。被授权人签署/盖章完成后，将沿原路寄回其中一份。授权人采用电子签名形式签署的，即视为其确认该签名为其本人真实意愿的表示并由其本人操作。无论采用何种方式，授权人均需保证其签名的真实性与有效性。因电子签名或手写签名无效、虚假或非本人使用所产生的一切法律责任，均由授权人自行承担。';
        y = addWrappedText(doc, signatureClause, margin, y, pageWidth - 2 * margin);
        y += 10;

        // 确保使用中文字体
        doc.setFont('HarmonyOS', 'normal');
        
        doc.text('授权人签名：', margin, y);
        doc.text('被授权人签名（印章）：', pageWidth - margin - 60, y);
        
        y += 25;
        doc.text(`日期：${dateString}`, margin, y);
        doc.text(`日期：${dateString}`, pageWidth - margin - 60, y);
        
        // 添加授权作品清单页面
        doc.addPage();
        
        // 标题
        doc.setFont('HarmonyOS', 'bold');
        doc.setFontSize(16);
        doc.text('【附件】极音记授权作品清单', pageWidth / 2, margin, { align: 'center' });
        
        // 表头
        const headers = [
          '序号', '专辑名称', '音乐名称', '表演者名称', '词作者', '曲作者', 
          '词曲权利比例', '表演者权利比例', '录音制作者权利比例'
        ];
        
        // 绘制表格
        function drawTable(doc, data, headers, startY, margin) {
          const pageWidth = doc.internal.pageSize.width;
          const contentWidth = pageWidth - 2 * margin;
          
          // 使用jspdf-autotable插件创建表格
          doc.autoTable({
            startY: startY,
            head: [headers],
            body: data,
            margin: { left: margin, right: margin },
            columnStyles: {
              0: { cellWidth: contentWidth * 0.05 }, // 序号
              1: { cellWidth: contentWidth * 0.12 }, // 专辑名称
              2: { cellWidth: contentWidth * 0.12 }, // 音乐名称
              3: { cellWidth: contentWidth * 0.15 }, // 表演者名称
              4: { cellWidth: contentWidth * 0.11 }, // 词作者
              5: { cellWidth: contentWidth * 0.11 }, // 曲作者
              6: { cellWidth: contentWidth * 0.11 }, // 词曲权利比例
              7: { cellWidth: contentWidth * 0.11 }, // 表演者权利比例
              8: { cellWidth: contentWidth * 0.12 }  // 录音制作者权利比例
            },
            headStyles: {
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              fontSize: 8,
              cellPadding: 2,
              lineWidth: 0.1,
              lineColor: [200, 200, 200]
            },
            bodyStyles: {
              halign: 'center',
              valign: 'middle',
              fontSize: 8,
              cellPadding: 2,
              lineWidth: 0.1,
              lineColor: [200, 200, 200]
            },
            styles: {
              font: 'HarmonyOS',
              overflow: 'linebreak', // 确保文本自动换行
              cellWidth: 'wrap',     // 自动调整单元格宽度
              minCellHeight: 10,     // 最小单元格高度
              cellPadding: 3         // 单元格内边距，增加这个值可以提供更多空间
            },
            willDrawCell: function(data) {
              // 可以在这里自定义单元格绘制
              if (data.section === 'body') {
                // 对于表格内容，不限制行高
                data.cell.styles.minCellHeight = Math.max(10, data.cell.height);
              }
            },
            didParseCell: function(data) {
              // 在单元格解析后调整样式
              if (data.section === 'body') {
                data.cell.styles.overflow = 'linebreak';
                data.cell.styles.cellPadding = 3;
              }
            }
          });
          
          // 返回表格结束的Y坐标
          return doc.lastAutoTable.finalY;
        }

        // 绘制表格
        y = drawTable(doc, tableData, headers, margin + 15, margin);
        
        // 保存PDF文件，触发浏览器下载
        try {
          console.log('准备生成并下载PDF文件');
          const fileName = `授权书_${album.title}_${dateString}.pdf`;
          
          // 直接使用save方法下载PDF，这样可以避免blob操作可能导致的问题
          doc.save(fileName);
          
          console.log('临时授权书生成和下载成功');
          return { success: true, message: '临时授权书生成成功' };
        } catch (saveError) {
          console.error('保存PDF文件失败:', saveError);
          throw new Error('保存授权书失败，请稍后重试: ' + saveError.message);
        }
      } catch (importError) {
        console.error('导入jsPDF或autoTable插件失败:', importError);
        throw new Error('PDF生成组件加载失败，请刷新页面重试');
      }
    } catch (error) {
      console.error('验证身份证号码失败:', error);
      
      // 处理API错误
      if (error.response && error.response.data) {
        console.error('API错误响应:', error.response.data);
        throw new Error(error.response.data.message || '验证身份证号码失败');
      }
      
      throw error;
    }
  } catch (error) {
    console.error('生成临时授权书错误:', error);
    throw error.response?.data?.message || error.message || '生成临时授权书失败';
  }
};

/**
 * 管理员生成授权书文件（接受自定义输入的信息）
 * @param {object} userInfo - 包含用户姓名和身份证号的对象
 * @param {object} albumInfo - 包含专辑信息和歌曲列表的对象
 * @returns {Promise} - 返回生成结果的Promise
 */
export const generateAdminAuthorization = async (userInfo, albumInfo) => {
  try {
    console.log('开始生成管理员自定义授权书');
    console.log('用户信息:', { realName: userInfo.realName, idNumber: userInfo.idNumber ? '已提供' : '未提供' });
    console.log('专辑信息:', { title: albumInfo.title, songsCount: albumInfo.songs?.length || 0 });

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    // 获取当前日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}年${month}月${day}日`;
    
    // 动态导入jsPDF库
    try {
      console.log('开始导入jsPDF');
      
      // 导入 jsPDF
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF; // 兼容不同打包方式
      if (!jsPDF || typeof jsPDF !== 'function') {
        console.error('jsPDF构造函数未正确加载:', jsPDF);
        throw new Error('无法获取jsPDF构造函数');
      }
      
      // 导入 jspdf-autotable
      await import('jspdf-autotable');
      console.log('jspdf-autotable 导入成功');

      // 创建PDF文档实例
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
      });
      
      // 确保jspdf-autotable插件已加载
      if (typeof doc.autoTable !== 'function') {
        console.error('jspdf-autotable插件未正确加载');
        throw new Error('jspdf-autotable插件未正确加载，请确保已安装该插件');
      }

      // 基本验证
      if (!doc || !doc.internal) {
        console.error('PDF实例创建失败:', doc);
        throw new Error('PDF实例创建失败');
      }

      // 设置文档属性
      doc.setProperties({
        title: '授权书',
        subject: '音乐作品授权',
        author: '极音记',
        keywords: '授权书,音乐,版权',
        creator: '极音记'
      });

      // 加载中文字体
      await loadFonts(doc);

      console.log('PDF文档初始化成功');

      // 定义页面尺寸和边距
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;

      console.log('页面参数:', { pageWidth, pageHeight, margin });

      // 创建表格数据
      const tableData = [];
      
      // 添加歌曲数据
      if (albumInfo.songs && albumInfo.songs.length > 0) {
        albumInfo.songs.forEach((song, index) => {
          let artistNames = '';
          let realNames = '';
          
          if (Array.isArray(song.Artists)) {
            artistNames = song.Artists.map(a => a.name).join('、');
            realNames = song.Artists.map(a => a.realName || a.name).join('、');
          } else if (typeof song.artists === 'string') {
            // 处理手动输入的情况
            artistNames = song.artists;
            realNames = song.lyricists || song.artists;
          }
          
          tableData.push([
            (index + 1).toString(),
            albumInfo.title,
            song.title,
            artistNames,
            song.lyricists || realNames,
            song.composers || realNames,
            '100%',
            '100%',
            '100%'
          ]);
        });
      }

      console.log('表格数据准备完成');

      // 辅助函数：添加文本并自动换行
      function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
        // 确保使用中文字体
        doc.setFont('HarmonyOS', 'normal');
        const lines = doc.splitTextToSize(text, maxWidth);
        for (let i = 0; i < lines.length; i++) {
          doc.text(lines[i], x, y + (i * lineHeight));
        }
        return y + (lines.length * lineHeight);
      }

      // 辅助函数：添加章节
      function addSection(doc, title, content, startY, margin) {
        const pageWidth = doc.internal.pageSize.width;
        const contentWidth = pageWidth - 2 * margin;
        let currentY = startY;
        
        // 检查是否需要新页面
        if (currentY > doc.internal.pageSize.height - 50) {
          doc.addPage();
          currentY = margin;
        }
        
        // 添加标题
        doc.setFont('HarmonyOS', 'bold');
        doc.setFontSize(13);
        doc.text(title, margin, currentY);
        currentY += 8;
        
        // 恢复正文字体
        doc.setFont('HarmonyOS', 'normal');
        doc.setFontSize(11);
        
        // 添加内容段落
        for (const paragraph of content) {
          // 检查是否需要新页面
          if (currentY > doc.internal.pageSize.height - 40) {
            doc.addPage();
            currentY = margin;
          }
          
          // 添加段落文本并自动换行
          currentY = addWrappedText(doc, paragraph, margin, currentY, contentWidth);
          currentY += 5; // 段落间距
        }
        
        return currentY + 5; // 返回下一个内容的Y位置
      }

      // 标题
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(18);
      doc.text('授权书', pageWidth / 2, margin + 10, { align: 'center' });
      
      // 设置正文字体
      doc.setFont('HarmonyOS', 'normal');
      doc.setFontSize(11);
      
      // 当前Y位置
      let y = margin + 25;
      
      // 添加基本信息
      doc.text(`授权人：${userInfo.realName || ''}`, margin, y);
      y += 10;
      doc.text(`授权人身份证号码：${userInfo.idNumber || ''}`, margin, y);
      y += 10;
      doc.text(`被授权人：上海极音记文化科技有限公司`, margin, y);
      y += 15;
      
      // 第一章节
      const section1Content = [
        '1、授权人依据《中华人民共和国著作权法》的规定，将其作为合法权利人所享有的授权作品及全部下述权利专有许可被授权人（详见附件《授权作品及授权权利清单》）：（1）音乐词曲作品著作权之改编权、复制权、表演权、广播权和信息网络传播权等；（2）MV作品著作权之信息网络传播权和广播权；（3）录音/录像制品的词曲著作权和表演者权、录音制作者权、录像制作者权等邻接权之信息网络传播权、广播权及获酬权；以及（4）表演者权和录音制作者权之复制权。',
        '2、本授权书的信息网络传播权是指：以有线或者无线方式向公众提供或传播作品、录音及表演，包括交互式和非交互式。具体使用形式包括但不限于网络点播、下载、IPTV、数字电视、无线或有线增值业务等现有各种使用形式及授权期限内新出现的其他使用形式等，具体用户的接收终端和显示终端形式包括不限于手机、电脑、平板电脑、机顶盒、MPEG4播放器、车载电视、航空器电视等现有接收终端或显示终端及授权期限内新出现的其他接收终端或显示终端等。',
        '3、被授权人有权以自己的名义制止、打击侵权和盗版行为，包括但不限于申请证据保全、财产保全、行政投诉、刑事自诉、提起民事诉讼、上诉、申请执行、和解、获得赔偿金等（"维权"）。',
        '4、本授权书所称之盗版行为是指：在未获合法复制权、表演权和信息网络传播权授权的情况下，任何使用授权作品之行为。包括但不限于利用网络传播未获授权音乐作品的任何版本（如录音室版、现场演唱版、改变组曲和混音的衍生版等）之录音制品的行为。',
        '5、宣传推广授权：为宣传、推广授权作品之目的，授权人在此不可撤销地授予被授权人及其关联公司、合作方在授权期限内、于全世界范围内，无偿使用授权人及相关艺术家（包括但不限于表演者、词曲作者）的姓名（包括真实姓名、艺名、曾用名）、肖像、照片、形象、个人简介以及与授权作品相关的艺术作品（如专辑封面、宣传图）的权利。'
      ];
      y = addSection(doc, '一、授权作品及授权权利', section1Content, y, margin);
      
      // 第二章节
      const section2Content = [
        '1、本授权为独占性授权，即被授权人有权排除授权人及任何第三方使用上述授权作品。授权人在授权书生效期间不可将"【附件】极音记授权作品清单"内的作品授权其他第三方。除非事先获得被授权人的书面同意，否则授权方不得自行或允许第三方以任何形式使用授权作品。',
        '2、被授权人有权将全部授权作品及授权权利转授权给其关联公司及任何第三方使用。'
      ];
      y = addSection(doc, '二、授权性质', section2Content, y, margin);
      
      // 第三章节
      const section3Content = [
        '自本授权书签署日起，有效期五年。授权歌曲授权自提交日起，有效期五年。同等交易条件下，被授权人对授权人的授权作品拥有优先续约权，即授权人应优先与被授权人商谈续约事宜，该优先续约权并不影响授权方在授权期限届满后与任何第三方达成授权合作。授权期限届满后，基于双方约定的部分使用目的下，授权人将授权作品著作权之信息网络传播权和广播权永久非独占性授权被授权人按照授权协议的约定使用。如果授权人希望继续使用被授权人的平台或其他服务来推广和销售授权作品，双方应当就续签事宜提前至少6个月开始协商。'
      ];
      y = addSection(doc, '三、授权期限', section3Content, y, margin);
      
      // 第四章节
      const section4Content = ['全世界。'];
      y = addSection(doc, '四、授权范围', section4Content, y, margin);
      
      // 第五章节
      const section5Content = [
        '1.授权人如实填写"【附件】极音记授权作品清单"的所有相关信息，并保证该等信息的准确性和真实性。授权人可以将新作品的清单交付被授权人，授权人以被授权人指定的方式交付作品清单，视为对被授权人享有交付作品的专有权利的确认，双方默认指定的交付方式为E-mail：submit@acmetone.com',
        '2.授权人在向被授权人交付授权作品清单的同时，应交付清单所涉及的作品音频(或视频)介绍和相关资料，具体内容和要求见【发行物料格式示范】文件。',
        '3.如果授权人未能及时提供必要文件或信息导致的任何延误或损失，授权人自行承担因歌曲发行导致的问题责任。'
      ];
      y = addSection(doc, '五、授权作品交付', section5Content, y, margin);
      
      // 第六章节 - 费用、分成细则
      // 检查是否需要新页面
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(13);
      doc.text('六、费用、分成细则', margin, y);
      y += 8;
      
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(11);
      doc.text('1.费用', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      doc.setFontSize(11);
      const feeText = '被授权人应在协议有效期内按本协议约定的方式向授权方支付费用，该费用包括被授权人取得本次版权合作的需向授权人支付的全部费用，包括但不限于授权许可费用、诉讼赔偿金等。除此之外，被授权人无需向授权方支付任何其他费用。';
      y = addWrappedText(doc, feeText, margin, y, pageWidth - 2 * margin);
      y += 8;
      
      doc.setFont('HarmonyOS', 'bold');
      doc.text('2.费用计算方式', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      const feeCalcItems = [
        '(1) 商用授权使用作品获得的收益扣除被授权人运营成本的10%后为可分配收益，双方对可分配收益按照如下比例进行分配：授权方【70】%，被授权人【30】%',
        '(2) 被授权人通过第三方渠道（如QQ音乐、网易云音乐等）发行认领获得的版税收益分成，按照授权人【70】%，被授权人【30】%的标准向授权人进行结算。',
        '(3) 双方约定以人民币作为结算货币。',
        '(4) 双方同意每年结算4次，每次结算日固定为4月15日，7月15日，10月15日及1月15日，结算周期为三个月。被授权人应于每一个结算日的次月10个工作日前，向授权人提供授权作品的收益分配明细并与被授权人进行对账，授权人应在收到对账明细后15个工作日内进行确认。授权人在收到对账明细后15个工作日内未进行回复或提出异议，则视为确认该等账目。若本协议中约定的任何期限的最后一日恰逢法定节假日（包括周末及国家法定调休假日），则该期限应自动顺延至节假日结束后的第一个工作日。',
        '(5) 双方约定，若授权人收益分成未达到50元人民币，则仅通知，不予结算，转入下一次结算日。',
        '(6) 授权人应理解并同意，上述支付版税的前提是被授权人已经获得上游合作方的版税分成，因上游合作方未按时分成导致被授权人迟延履行支付版税义务的，不视作违约。'
      ];
      
      for (const item of feeCalcItems) {
        // 检查是否需要新页面
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        
        y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
        y += 5;
      }
      
      y += 4;
      doc.setFont('HarmonyOS', 'bold');
      doc.text('3.费用的支付', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      const paymentItems = [
        '(1) 授权人确认无异议或甲方确认后90个工作日内，向授权人账户支付费用。在未收到授权人提供的票据前，被授权人不承担付款义务，亦无需向授权人支付费用。',
        '(2) 如因授权人原因造成第三方追责给被授权人造成损失，或被授权人有合理理由相信即将造成损失，被授权人可暂停支付授权人费用，并优先从向授权人支付的费用获得赔偿。'
      ];
      
      for (const item of paymentItems) {
        // 检查是否需要新页面
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        
        y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
        y += 5;
      }
      
      y += 4;
      doc.setFont('HarmonyOS', 'bold');
      doc.text('4. 税务处理', margin, y);
      y += 6;
      
      doc.setFont('HarmonyOS', 'normal');
      const taxItems = [
        '(1) 税费承担与代扣代缴：双方确认，本协议项下被授权人（上海极音记文化科技有限公司）向授权人支付的任何费用均为税前金额。被授权人有权并有义务根据《中华人民共和国个人所得税法》、《中华人民共和国税收征收管理法》及相关法规的规定，在支付前代为扣缴授权人应承担的全部税费（包括但不限于个人所得税）。授权人实际收到的结算金额为扣除所有应缴税费后的净额。',
        '(2) 信息提供与保证义务：授权人必须向被授权人提供真实、准确、完整且有效的身份信息和税务信息（包括但不限于姓名、身份证号码、银行账户信息等），以供被授权人履行税务申报及代扣代缴义务。授权人保证其所提供信息在整个授权期限内持续有效。',
        [ // item (3)
          '(3) 风险责任承担：如因授权人提供的信息错误、过时、不完整或具有误导性，或因授权人自身的税务状况（如税务居民身份变更）未及时通知被授权人，而导致：',
          '_INDENT_a) 被授权人无法正确履行代扣代缴义务；',
          '_INDENT_b) 被授权人受到税务机关的任何形式的调查、处罚、罚款或被要求补缴/滞纳税款；',
          '_INDENT_c) 给被授权人造成任何其他损失的。',
          '则全部责任、后果及由此产生的全部费用（包括但不限于罚款、滞纳金、律师费、补缴税款等）均由授权人承担。'
        ],
        '(4) 直接抵扣权：在发生上述(3)款所述情形时，被授权人有权将授权人应承担的全部费用直接从任何应付给授权人的款项中抵扣，并保留进一步追偿的权利。此举不构成被授权人违约。',
        '(5) 发票：若授权人有资格并选择开具增值税发票，应在每次结算确认后向被授权人提供合法有效的等额发票。被授权人将在收到合规发票后启动付款流程。'
      ];
      
      const indentSize = 5; // 5mm indent
      const prefix = '_INDENT_';

      for (const item of taxItems) {
        // 检查是否需要新页面
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }

        if (Array.isArray(item)) {
          // Handle item (3) with its sub-parts
          for (let i = 0; i < item.length; i++) {
            const subItem = item[i];
            const isIndented = subItem.startsWith(prefix);
            const currentMargin = isIndented ? margin + indentSize : margin;
            const textToRender = isIndented ? subItem.substring(prefix.length) : subItem;
            const maxWidth = pageWidth - 2 * margin - (isIndented ? indentSize : 0);

            if (i > 0 && y > pageHeight - 40) { // check for page break for sub-items
                doc.addPage();
                y = margin;
            }
            y = addWrappedText(doc, textToRender, currentMargin, y, maxWidth);
            
            if (i < item.length - 1) {
              y += 2; // small gap between sub-items
            }
          }
        } else {
          y = addWrappedText(doc, item, margin, y, pageWidth - 2 * margin);
        }
        y += 5;
      }
      
      // 第七章节
      const section7Content = [
        '(1) 保密条款：规定双方应对本协议内容及因履行本协议而知悉的对方商业秘密负有保密义务。',
        '(2) 法律适用与争议解决：本授权书的订立、效力、解释、履行及争议的解决均适用中华人民共和国大陆地区法律。任何因本授权书引起的或与本授权书有关的争议，双方应首先尝试通过友好协商解决；若协商不成，任一方均有权依据《中华人民共和国民事诉讼法》的规定，将争议提交至被授权人所在地有管辖权的人民法院通过诉讼方式解决。',
        '(3) 作品完整权：为使被授权人能充分、有效地行使本授权书项下的各项权利，授权人同意，在法律允许的最大范围内，被授权人可为技术或商业推广之需，对授权作品进行必要的编辑、截取或改编（例如制作铃声、片段用于短视频等），授权人承诺不对此主张保护作品完整权等著作人身权。',
        '(4) 根本违约与合同解除：授权人若违反其在本授权书第八条（授权人的承诺与保证）中所作的任何实质性保证，或提供的文件、信息存在虚假、误导，则视为《中华人民共和国民法典》所规定的根本性违约。在此情况下，被授权人有权依据《中华人民共和国民法典》关于合同解除的相关规定，单方面立即书面通知授权人终止本协议，而无需承担任何责任，并有权要求授权人赔偿因此造成的一切损失。'
      ];
      y = addSection(doc, '七、补充条款', section7Content, y, margin);
      
      // 第八章节
      const section8Content = [
        '授权人在此作出以下不可撤销的、构成其核心合同义务的承诺与保证，并确认如违反以下任何条款，将依据《中华人民共和国民法典》、《中华人民共和国著作权法》等相关法律法规承担全部法律责任：',
        '1. 权利来源保证: 授权人保证，就本授权书所涉全部授权作品，其拥有独立、完整、无争议的合法权利。若授权人非原始权利人，其保证已从原始权利人处获得了充分、有效、不可撤销的、可进行转授权的（sublicensable）书面授权，确保其有权依据本授权书的条款向被授权人（上海极音记文化科技有限公司）进行再授权。',
        '2. 权利证明义务: 应被授权人请求，授权人有义务提供相关权利证明文件，包括但不限于与原始权利人签署的授权协议、权利证书等，以兹证明其权利的合法性与完整性。若授权人未能提供或提供的文件不足以证明其权利，被授权人有权中止合作并暂停支付任何费用，直至授权人提供有效证明为止。',
        '3. 元数据及信息准确性保证：授权人保证其向被授权人提供的所有信息、元数据（Metadata）及相关材料，包括但不限于本协议附件、歌曲标题、表演者信息、以及词曲作者的真实姓名（法定姓名），均是真实、准确、完整且无误导性的。授权人将对因该等信息不准确或虚假而引起的一切后果承担全部责任。',
        '4. 无侵权保证: 授权人保证授权作品的内容、材料以及授权人行使和履行本授权书项下权利和义务的行为，不侵犯任何第三方的合法权益（包括但不限于著作权、商标权、表演者权、肖像权、隐私权等）。',
        '5. 责任承担: 若因授权人违反上述任何保证（尤其是因授权链条不完整、权利瑕疵或内容侵权等问题），导致被授权人或其关联公司、合作方面临任何形式的索赔、诉讼或行政处罚，授权人应承担由此引发的全部法律责任。授权人应主动出面与第三方进行交涉，并承担所有为解决争议而产生的费用。',
        '6. 损失赔偿: 在发生上述第5点所述情形时，授权人同意赔偿被授权人及其关联公司、合作方因此遭受的全部直接和间接损失。该等损失包括但不限于：向第三方支付的赔偿金/和解金、行政罚款、合理的律师费、诉讼费、公证鉴定费及其他所有维权开支。被授权人有权从任何应支付给授权人的款项（包括但不限于版税分成）中直接抵扣上述损失，不足部分有权继续追偿。',
        '7. 最终确认: 授权人确认，其在签署本授权书前已仔细阅读并完全理解所有条款的含义及法律后果，并自愿接受其约束。本授权书的签署代表授权人对其所作保证的正式确认。',
        '8. 费用暂扣权: 若发生或被授权人有合理理由怀疑可能发生任何违反本授权书保证的情形，或出现任何第三方主张权利，被授权人有权立即暂停支付应付给授权人的任何费用（包括但不限于版税分成），直至争议完全解决且授权人提供令被授权人满意的权利证明为止。此举不构成被授权人违约，授权人亦无权就此主张任何利息或赔偿。',
        '9. 信赖原则与免责声明: 授权人确认并同意，被授权人是基于对授权人在本协议中所作承诺与保证的完全信赖，而接受授权并进行后续的作品分发、推广等活动。被授权人没有义务对授权作品的权利状态进行独立的调查或核实。 即使被授权人进行了部分核查，也不代表其承担了核查义务，更不减轻授权人在本协议项下的任何保证责任。授权人自愿承担因其虚假承诺或侵权行为所引发的一切法律后果。'
      ];
      y = addSection(doc, '八、授权人的承诺与保证', section8Content, y, margin);
      
      // 添加签名区域
      // 检查是否需要新页面
      if (y > pageHeight - 90) { // Increased space for longer signature clause
        doc.addPage();
        y = margin;
      } else {
        y += 15;
      }
      
      const signatureClause = '本授权书可通过手写签名或符合《中华人民共和国电子签名法》规定的可靠电子签名形式（包括但不限于通过上海"一网通办"平台等政府认可的第三方数字证书服务机构生成的数字签名）签署，二者具有同等法律效力。若选择手写签名，授权人应打印本授权书一式两份并签名，邮寄至被授权人所在地：陕西省西安市长安区西北工业大学长安校区。如果被授权人通知了其他地址，则按其最新通知的地址邮寄。被授权人签署/盖章完成后，将沿原路寄回其中一份。授权人采用电子签名形式签署的，即视为其确认该签名为其本人真实意愿的表示并由其本人操作。无论采用何种方式，授权人均需保证其签名的真实性与有效性。因电子签名或手写签名无效、虚假或非本人使用所产生的一切法律责任，均由授权人自行承担。';
      y = addWrappedText(doc, signatureClause, margin, y, pageWidth - 2 * margin);
      y += 10;

      // 确保使用中文字体
      doc.setFont('HarmonyOS', 'normal');
      
      doc.text('授权人签名：', margin, y);
      doc.text('被授权人签名（印章）：', pageWidth - margin - 60, y);
      
      y += 25;
      doc.text(`日期：${dateString}`, margin, y);
      doc.text(`日期：${dateString}`, pageWidth - margin - 60, y);
      
      // 添加授权作品清单页面
      doc.addPage();
      
      // 标题
      doc.setFont('HarmonyOS', 'bold');
      doc.setFontSize(16);
      doc.text('【附件】极音记授权作品清单', pageWidth / 2, margin, { align: 'center' });
      
      // 表头
      const headers = [
        '序号', '专辑名称', '音乐名称', '表演者名称', '词作者', '曲作者', 
        '词曲权利比例', '表演者权利比例', '录音制作者权利比例'
      ];
      
      // 绘制表格
      function drawTable(doc, data, headers, startY, margin) {
        const pageWidth = doc.internal.pageSize.width;
        const contentWidth = pageWidth - 2 * margin;
        
        // 使用jspdf-autotable插件创建表格
        doc.autoTable({
          startY: startY,
          head: [headers],
          body: data,
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.05 }, // 序号
            1: { cellWidth: contentWidth * 0.12 }, // 专辑名称
            2: { cellWidth: contentWidth * 0.12 }, // 音乐名称
            3: { cellWidth: contentWidth * 0.15 }, // 表演者名称
            4: { cellWidth: contentWidth * 0.11 }, // 词作者
            5: { cellWidth: contentWidth * 0.11 }, // 曲作者
            6: { cellWidth: contentWidth * 0.11 }, // 词曲权利比例
            7: { cellWidth: contentWidth * 0.11 }, // 表演者权利比例
            8: { cellWidth: contentWidth * 0.12 }  // 录音制作者权利比例
          },
          headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          bodyStyles: {
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          styles: {
            font: 'HarmonyOS',
            overflow: 'linebreak', // 确保文本自动换行
            cellWidth: 'wrap',     // 自动调整单元格宽度
            minCellHeight: 10,     // 最小单元格高度
            cellPadding: 3         // 单元格内边距，增加这个值可以提供更多空间
          },
          willDrawCell: function(data) {
            // 可以在这里自定义单元格绘制
            if (data.section === 'body') {
              // 对于表格内容，不限制行高
              data.cell.styles.minCellHeight = Math.max(10, data.cell.height);
            }
          },
          didParseCell: function(data) {
            // 在单元格解析后调整样式
            if (data.section === 'body') {
              data.cell.styles.overflow = 'linebreak';
              data.cell.styles.cellPadding = 3;
            }
          }
        });
        
        // 返回表格结束的Y坐标
        return doc.lastAutoTable.finalY;
      }

      // 绘制表格
      y = drawTable(doc, tableData, headers, margin + 15, margin);
      
      // 保存PDF文件，触发浏览器下载
      try {
        console.log('准备生成并下载PDF文件');
        const fileName = `授权书_${albumInfo.title}_${dateString}_管理员生成.pdf`;
        
        // 直接使用save方法下载PDF，这样可以避免blob操作可能导致的问题
        doc.save(fileName);
        
        console.log('管理员授权书生成成功');
        return { success: true, message: '管理员授权书生成成功' };
      } catch (saveError) {
        console.error('保存PDF文件失败:', saveError);
        throw new Error('保存授权书失败，请稍后重试: ' + saveError.message);
      }
    } catch (importError) {
      console.error('导入jsPDF或autoTable插件失败:', importError);
      throw new Error('PDF生成组件加载失败，请刷新页面重试');
    }
  } catch (error) {
    console.error('生成管理员授权书错误:', error);
    throw error.response?.data?.message || error.message || '生成管理员授权书失败';
  }
};