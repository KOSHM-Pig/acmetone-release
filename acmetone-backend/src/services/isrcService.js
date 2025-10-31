const axios = require('axios');

/**
 * ISRC搜索器 - 用于查询国际标准录音制品代码
 * 
 * 功能特性：
 * - 自动获取和管理API TOKEN
 * - 支持艺术家和歌曲名称搜索
 * - 智能厂牌匹配，优先返回指定厂牌的结果
 * - 自动重试机制，TOKEN失效时自动刷新
 * - 完整的错误处理和降级策略
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */
class ISRCSearcher {
    /**
     * 构造函数 - 初始化ISRC搜索器
     * 
     * @description 创建一个新的ISRC搜索器实例，配置API端点和备用TOKEN
     */
    constructor() {
        /** @type {string} API基础URL */
        this.baseURL = 'https://isrc-api.soundexchange.com/api/ext';
        
        /** @type {string} 网站URL，用于请求头 */
        this.siteURL = 'https://isrcsearch.ifpi.org/';
        
        /** @type {string} 备用TOKEN，当动态获取失败时使用 */
        this.fallbackToken = 'a95756400b5626ccb62aea24784be450179d8183';
        
        /** @type {string|null} 当前有效的TOKEN */
        this.currentToken = null;
        
        /** @type {number|null} TOKEN获取时间戳 */
        this.tokenTimestamp = null;
        
        /** @type {number} TOKEN有效期（毫秒），默认30分钟 */
        this.tokenExpiry = 30 * 60 * 1000;
        
        /** @type {boolean} 是否正在获取TOKEN，防止并发请求 */
        this.isGettingToken = false;
        
        /** @type {boolean} 是否启用调试输出 */
        this.debug = true;
        
        /** @type {boolean} 是否静默模式（禁用所有输出） */
        this.silent = false;
    }

    /**
     * 设置调试模式
     * 
     * @description
     * 控制是否输出详细的调试信息
     * 
     * @param {boolean} enabled - 是否启用调试模式
     * 
     * @example
     * searcher.setDebug(true);  // 启用调试输出
     * searcher.setDebug(false); // 禁用调试输出
     */
    setDebug(enabled) {
        this.debug = enabled;
        if (!this.silent) {
            console.log(`调试模式已${enabled ? '启用' : '禁用'}`);
        }
    }

    /**
     * 设置静默模式
     * 
     * @description
     * 控制是否禁用所有控制台输出
     * 
     * @param {boolean} enabled - 是否启用静默模式
     * 
     * @example
     * searcher.setSilent(true);  // 启用静默模式
     * searcher.setSilent(false); // 禁用静默模式
     */
    setSilent(enabled) {
        this.silent = enabled;
        if (!enabled) {
            console.log(`静默模式已${enabled ? '启用' : '禁用'}`);
        }
    }

    /**
     * 内部日志输出方法
     * 
     * @description
     * 根据当前设置决定是否输出日志
     * 
     * @param {string} message - 日志消息
     * @param {string} [level='info'] - 日志级别: 'info' | 'debug' | 'warn' | 'error'
     * 
     * @private
     */
    _log(message, level = 'info') {
        if (this.silent) return;
        
        if (level === 'debug' && !this.debug) return;
        
        switch (level) {
            case 'error':
                console.error(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            case 'debug':
                console.log(`[DEBUG] ${message}`);
                break;
            default:
                console.log(message);
        }
    }

    /**
     * 检查TOKEN是否已过期
     * 
     * @description
     * 根据TOKEN获取时间和设定的有效期判断是否需要刷新
     * 
     * @returns {boolean} true表示已过期，需要重新获取
     * 
     * @private
     */
    isTokenExpired() {
        if (!this.currentToken || !this.tokenTimestamp) {
            return true;
        }
        
        const now = Date.now();
        const elapsed = now - this.tokenTimestamp;
        return elapsed >= this.tokenExpiry;
    }

    /**
     * 获取API访问TOKEN（优化版）
     * 
     * @description 
     * 智能TOKEN管理策略：
     * 1. 检查缓存TOKEN是否存在且未过期
     * 2. 过期或不存在时自动获取新TOKEN
     * 3. 防止并发请求，多个请求共享同一个TOKEN获取过程
     * 4. 获取失败时使用备用TOKEN
     * 
     * @returns {Promise<string>} 返回有效的TOKEN字符串
     * 
     * @example
     * const searcher = new ISRCSearcher();
     * const token = await searcher.getToken();
     * console.log('TOKEN:', token);
     */
    async getToken() {
        // 如果TOKEN有效且未过期，直接返回
        if (this.currentToken && !this.isTokenExpired()) {
            return this.currentToken;
        }

        // 防止并发请求TOKEN
        if (this.isGettingToken) {
            // 等待正在进行的TOKEN获取完成
            while (this.isGettingToken) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // 再次检查TOKEN是否已获取
            if (this.currentToken && !this.isTokenExpired()) {
                return this.currentToken;
            }
        }

        this.isGettingToken = true;
        
        try {
            this._log('TOKEN已过期或不存在，正在获取新TOKEN...', 'debug');
            
            const response = await axios.get(`${this.baseURL}/login`, {
                headers: {
                    'accept': '*/*',
                    'content-type': 'application/json',
                    'origin': this.siteURL,
                    'referer': this.siteURL,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
                },
                timeout: 10000 // 10秒超时
            });

            if (response.data && response.data.token) {
                this.currentToken = response.data.token;
                this.tokenTimestamp = Date.now();
                this._log(`获取TOKEN成功: ${this.currentToken}`, 'debug');
                this._log(`TOKEN将在${Math.round(this.tokenExpiry / 60000)}分钟后过期`, 'debug');
                return this.currentToken;
            }

            this._log(`登录API响应异常: ${JSON.stringify(response.data)}`, 'warn');
            this._log('使用备用TOKEN', 'warn');
            this.currentToken = this.fallbackToken;
            this.tokenTimestamp = Date.now();
            return this.fallbackToken;

        } catch (error) {
            this._log(`获取TOKEN失败: ${error.message}`, 'warn');
            this._log('使用备用TOKEN', 'warn');
            this.currentToken = this.fallbackToken;
            this.tokenTimestamp = Date.now();
            return this.fallbackToken;
        } finally {
            this.isGettingToken = false;
        }
    }

    /**
     * 验证TOKEN是否有效
     * 
     * @description
     * 通过发送测试请求验证TOKEN是否仍然有效
     * 用于检测TOKEN是否被服务端提前失效
     * 
     * @param {string} token - 要验证的TOKEN
     * @returns {Promise<boolean>} TOKEN是否有效
     * 
     * @private
     */
    async validateToken(token) {
        try {
            const response = await axios.post(`${this.baseURL}/recordings`, {
                number: 10,
                start: 0,
                searchFields: {
                    recordingArtistName: { value: 'test' },
                    recordingTitle: { value: 'test' }
                }
            }, {
                headers: {
                    'authorization': `Token ${token}`,
                    'content-type': 'application/json',
                    'origin': this.siteURL,
                    'referer': this.siteURL,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 5000
            });
            
            return response.status === 200;
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                return false;
            }
            // 其他错误（如网络错误）认为TOKEN可能仍有效
            return true;
        }
    }

    /**
     * 搜索ISRC记录
     * 
     * @description
     * 根据艺术家名称和歌曲标题搜索ISRC记录
     * 支持厂牌匹配，当指定厂牌时会优先返回匹配的结果
     * 如果找不到厂牌匹配，则返回第一个结果
     * 
     * @param {string} artistName - 艺术家名称，必填
     * @param {string} songTitle - 歌曲标题，必填  
     * @param {number} [limit=10] - 返回结果数量限制，范围10-100
     * @param {string|null} [label=null] - 厂牌名称，可选。指定时启用智能匹配
     * 
     * @returns {Promise<Object>} 搜索结果对象
     * @returns {boolean} returns.success - 搜索是否成功
     * @returns {number} returns.totalCount - 总结果数量
     * @returns {Array<Object>} returns.results - 结果数组
     * @returns {string} returns.matchType - 匹配类型: 'normal' | 'exact_label_match' | 'first_result'
     * @returns {string} [returns.error] - 错误信息（仅当success为false时）
     * 
     * @example
     * // 基础搜索
     * const result = await searcher.search('Taylor Swift', 'Shake It Off');
     * 
     * @example  
     * // 带厂牌匹配的搜索
     * const result = await searcher.search('Taylor Swift', 'Shake It Off', 10, 'Big Machine Records');
     * if (result.success && result.matchType === 'exact_label_match') {
     *     console.log('找到厂牌精确匹配:', result.results[0]);
     * }
     * 
     * @example
     * // 结果对象结构
     * {
     *   success: true,
     *   totalCount: 5,
     *   matchType: 'exact_label_match',
     *   results: [{
     *     isrc: 'USRC17607839',
     *     artist: 'Taylor Swift', 
     *     title: 'Shake It Off',
     *     year: 2014,
     *     duration: '3:39',
     *     label: 'Big Machine Records',
     *     releaseDate: '2014-08-18',
     *     genre: ['Pop'],
     *     isValid: true
     *   }]
     * }
     */

    /**
     * 搜索ISRC记录（艺人+歌曲名+专辑名）
     * @param {string} artistName - 艺术家名称
     * @param {string} songTitle - 歌曲标题
     * @param {string} albumTitle - 专辑标题
     * @param {number} limit - 返回结果数量限制 (10-100)
     * @returns {Promise<Object>} 搜索结果
     */
    async searchWithArtistSongAlbum(artistName, songTitle, albumTitle, limit = 50) {
        // 参数验证
        if (!artistName || !songTitle || !albumTitle) {
            return {
                success: false,
                error: '艺人名称、歌曲标题和专辑标题都不能为空'
            };
        }

        // 验证limit参数范围
        if (limit < 10 || limit > 100) {
            this._log(`警告: limit参数必须在10-100之间，当前值${limit}，已调整为50`, 'warn');
            limit = 50;
        }

        const token = await this.getToken();

        try {
            this._log(`艺人+歌曲+专辑搜索: 艺人="${artistName}", 歌曲="${songTitle}", 专辑="${albumTitle}", 限制=${limit}`, 'debug');

            const response = await axios.post(`${this.baseURL}/recordings`, {
                number: limit,
                start: 0,
                searchFields: {
                    recordingArtistName: { value: artistName },
                    recordingTitle: { value: songTitle },
                    releaseName: { value: albumTitle }
                },
                showReleases: true
            }, {
                headers: {
                    'authorization': `Token ${token}`,
                    'content-type': 'application/json',
                    'origin': this.siteURL,
                    'referer': this.siteURL,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this._log(`API返回 ${response.data.recordings ? response.data.recordings.length : 0} 条结果`, 'debug');

            if (!response.data.recordings || response.data.recordings.length === 0) {
                return {
                    success: true,
                    results: []
                };
            }

            // 转换结果格式
            const results = response.data.recordings.map(record => ({
                isrc: record.isrc,
                title: record.recordingTitle,
                artist: record.recordingArtistName,
                album: record.releaseName,
                label: record.releaseLabel,
                releaseDate: record.releaseDate,
                upc: record.icpn,
                duration: record.duration,
                year: record.recordingYear
            }));

            return {
                success: true,
                results: results
            };

        } catch (error) {
            this._log(`艺人+歌曲+专辑搜索失败: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }

    async search(artistName, songTitle, limit = 10, label = null) {
        // 参数验证 - 歌曲标题必须有，艺人名称可以为空（用于二次搜索）
        if (!songTitle) {
            return {
                success: false,
                error: '歌曲标题不能为空'
            };
        }

        
        // 验证limit参数范围
        if (limit < 10 || limit > 100) {
            this._log(`警告: limit参数必须在10-100之间，当前值${limit}，已调整为10`, 'warn');
            limit = 10;
        }
        
        const token = await this.getToken();
        
        try {
            this._log(`开始搜索: 艺术家="${artistName || ''}", 歌曲="${songTitle}", 限制=${limit}${label ? `, 厂牌="${label}"` : ''}`, 'debug');
            
            const response = await axios.post(`${this.baseURL}/recordings`, {
                number: limit,
                start: 0,
                searchFields: {
                    recordingArtistName: { value: artistName || '' }, // 允许空字符串
                    recordingTitle: { value: songTitle },
                    releaseName: { value: '' }
                },
                showReleases: true // 获取完整的发行信息
            }, {
                headers: {
                    'authorization': `Token ${token}`,
                    'content-type': 'application/json',
                    'origin': this.siteURL,
                    'referer': this.siteURL,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const results = response.data.recordings || [];
            const totalCount = response.data.numberOfRecordings || results.length;

            this._log(`API返回 ${results.length} 条结果，总计 ${totalCount} 条`, 'debug');
            this._log(`API返回结果: ${JSON.stringify(results)}`, 'debug');

            // 处理和标准化结果数据
            let processedResults = results.map(item => ({
                isrc: item.isrc,
                artist: item.recordingArtistName,
                title: item.recordingTitle,
                year: item.recordingYear,
                duration: item.duration,
                label: item.releaseLabel,
                releaseDate: item.releaseDate,
                genre: item.genre,
                isValid: item.isValidIsrc === 'True'
            }));

            // 厂牌智能匹配逻辑
            if (label) {
                const exactMatch = this.findLabelMatch(processedResults, label);
                if (exactMatch) {
                    this._log(`找到厂牌强匹配: ${exactMatch.label}`);
                    return {
                        success: true,
                        totalCount: 1,
                        results: [exactMatch],
                        matchType: 'exact_label_match'
                    };
                } else if (processedResults.length > 0) {
                    // 没有找到厂牌匹配，返回第一个结果
                    this._log(`未找到厂牌匹配，返回第一个结果`);
                    return {
                        success: true,
                        totalCount: 1,
                        results: [processedResults[0]],
                        matchType: 'first_result'
                    };
                }
            }

            return {
                success: true,
                totalCount,
                results: processedResults,
                matchType: 'normal'
            };

        } catch (error) {
            // TOKEN失效自动重试机制
            if (error.response?.status === 401 || error.response?.status === 403) {
                this._log('TOKEN失效，清除缓存并重新获取...', 'warn');
                this.currentToken = null;
                this.tokenTimestamp = null;
                
                // 重新获取TOKEN并重试
                const newToken = await this.getToken();
                try {
                    this._log('使用新TOKEN重试请求...', 'debug');
                    const retryResponse = await axios.post(`${this.baseURL}/recordings`, {
                        number: limit,
                        start: 0,
                        searchFields: {
                            recordingArtistName: { value: artistName || '' }, // 允许空字符串
                            recordingTitle: { value: songTitle },
                            releaseName: { value: '' }
                        },
                        showReleases: true // 获取完整的发行信息
                    }, {
                        headers: {
                            'authorization': `Token ${newToken}`,
                            'content-type': 'application/json',
                            'origin': this.siteURL,
                            'referer': this.siteURL,
                            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    const results = retryResponse.data.recordings || [];
                    const totalCount = retryResponse.data.numberOfRecordings || results.length;

                    let processedResults = results.map(item => ({
                        isrc: item.isrc,
                        artist: item.recordingArtistName,
                        title: item.recordingTitle,
                        year: item.recordingYear,
                        duration: item.duration,
                        label: item.releaseLabel,
                        releaseDate: item.releaseDate,
                        genre: item.genre,
                        isValid: item.isValidIsrc === 'True'
                    }));

                    // 重试时也进行厂牌匹配
                    if (label) {
                        const exactMatch = this.findLabelMatch(processedResults, label);
                        if (exactMatch) {
                            this._log(`找到厂牌强匹配: ${exactMatch.label}`);
                            return {
                                success: true,
                                totalCount: 1,
                                results: [exactMatch],
                                matchType: 'exact_label_match'
                            };
                        } else if (processedResults.length > 0) {
                            this._log(`未找到厂牌匹配，返回第一个结果`);
                            return {
                                success: true,
                                totalCount: 1,
                                results: [processedResults[0]],
                                matchType: 'first_result'
                            };
                        }
                    }

                    return {
                        success: true,
                        totalCount,
                        results: processedResults,
                        matchType: 'normal'
                    };
                } catch (retryError) {
                    this._log(`重试也失败了: ${retryError.message}`, 'error');
                    return {
                        success: false,
                        error: retryError.response?.data || retryError.message
                    };
                }
            }

            this._log(`搜索请求失败: ${error.message}`, 'error');
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * 厂牌智能匹配算法
     * 
     * @description
     * 使用多层匹配策略查找最佳的厂牌匹配结果：
     * 1. 完全匹配 - 厂牌名称完全相同
     * 2. 包含匹配 - 目标厂牌包含在结果厂牌中  
     * 3. 被包含匹配 - 结果厂牌包含在目标厂牌中
     * 
     * @param {Array<Object>} results - 搜索结果数组
     * @param {string} targetLabel - 目标厂牌名称
     * 
     * @returns {Object|null} 匹配的结果对象，未找到时返回null
     * 
     * @example
     * const results = [
     *   { label: 'Sony Music Entertainment', ... },
     *   { label: 'Universal Music Group', ... }
     * ];
     * const match = searcher.findLabelMatch(results, 'Sony Music');
     * // 返回第一个结果（包含匹配）
     * 
     * @private
     */
    findLabelMatch(results, targetLabel) {
        if (!targetLabel || !results.length) return null;

        const normalizedTarget = targetLabel.toLowerCase().replace(/\s+/g, '');

        // 1. 完全匹配（去掉空格）- 最高优先级
        let exactMatch = results.find(item =>
            item.label && item.label.toLowerCase().replace(/\s+/g, '') === normalizedTarget
        );
        if (exactMatch) return exactMatch;

        // 2. 包含匹配 - 目标厂牌包含在结果厂牌中
        let containsMatch = results.find(item =>
            item.label && item.label.toLowerCase().replace(/\s+/g, '').includes(normalizedTarget)
        );
        if (containsMatch) return containsMatch;

        // 3. 被包含匹配 - 结果厂牌包含在目标厂牌中
        let includedMatch = results.find(item =>
            item.label && normalizedTarget.includes(item.label.toLowerCase().replace(/\s+/g, ''))
        );
        if (includedMatch) return includedMatch;

        return null;
    }

    /**
     * 格式化并输出搜索结果
     * 
     * @description
     * 将搜索结果以易读的格式输出到控制台
     * 包含匹配类型标识和完整的记录信息
     * 
     * @param {Object} searchResult - search方法返回的结果对象
     * 
     * @example
     * const result = await searcher.search('Artist', 'Song');
     * searcher.formatResults(result);
     * // 输出:
     * // === 搜索结果 (共3条) ===
     * // 1. ISRC: USRC17607839 ✓
     * //    艺术家: Artist
     * //    歌曲: Song
     * //    ...
     */
    formatResults(searchResult) {
        
        if (!searchResult.success) {
            this._log(`搜索失败: ${searchResult.error}`, 'error');
            return;
        }

        let matchTypeText = '';
        if (searchResult.matchType === 'exact_label_match') {
            matchTypeText = ' - 厂牌强匹配';
        } else if (searchResult.matchType === 'first_result') {
            matchTypeText = ' - 返回首个结果';
        }
        
        console.log(`\n=== 搜索结果 (共${searchResult.totalCount}条)${matchTypeText} ===`);
        
        if (searchResult.results.length === 0) {
            console.log('未找到匹配的记录');
            return;
        }

        searchResult.results.forEach((item, index) => {
            console.log(`${index + 1}. ISRC: ${item.isrc} ${item.isValid ? '✓' : '✗'}`);
            console.log(`   艺术家: ${item.artist}`);
            console.log(`   歌曲: ${item.title}`);
            console.log(`   年份: ${item.year || '未知'}`);
            console.log(`   时长: ${item.duration || '未知'}`);
            if (item.label) console.log(`   厂牌: ${item.label}`);
            if (item.genre) console.log(`   类型: ${Array.isArray(item.genre) ? item.genre.join(', ') : item.genre}`);
            console.log('---');
        });
    }

    /**
     * 清除TOKEN缓存
     * 
     * @description
     * 强制清除当前缓存的TOKEN和时间戳，下次调用getToken时会重新获取
     * 适用于TOKEN失效或需要刷新的场景
     * 
     * @example
     * searcher.clearToken();
     * const newToken = await searcher.getToken(); // 会重新获取
     */
    clearToken() {
        this.currentToken = null;
        this.tokenTimestamp = null;
        this._log('TOKEN缓存已清除', 'debug');
    }

    /**
     * 获取TOKEN状态信息
     * 
     * @description
     * 返回当前TOKEN的状态信息，用于调试和监控
     * 
     * @returns {Object} TOKEN状态对象
     * @returns {boolean} returns.hasToken - 是否有TOKEN
     * @returns {boolean} returns.isExpired - TOKEN是否已过期
     * @returns {number|null} returns.remainingTime - 剩余有效时间（毫秒）
     * @returns {string|null} returns.tokenPreview - TOKEN预览（前8位）
     * 
     * @example
     * const status = searcher.getTokenStatus();
     * console.log('TOKEN状态:', status);
     */
    getTokenStatus() {
        const hasToken = !!this.currentToken;
        const isExpired = this.isTokenExpired();
        let remainingTime = null;
        
        if (this.tokenTimestamp) {
            const elapsed = Date.now() - this.tokenTimestamp;
            remainingTime = Math.max(0, this.tokenExpiry - elapsed);
        }
        
        return {
            hasToken,
            isExpired,
            remainingTime,
            tokenPreview: this.currentToken ? this.currentToken.substring(0, 8) + '...' : null,
            expiryMinutes: Math.round(this.tokenExpiry / 60000)
        };
    }

    /**
     * 使用完整信息搜索ISRC（歌曲名+专辑+厂牌+发行日期）
     * @param {string} songTitle - 歌曲标题
     * @param {string} albumTitle - 专辑标题
     * @param {string} label - 发行厂牌
     * @param {string} releaseDate - 发行日期
     * @returns {Promise<Object>} 搜索结果
     */
    async searchWithFullInfo(songTitle, albumTitle = '', label = '', releaseDate = '') {
        try {
            this._log(`完整信息搜索: 歌曲="${songTitle}", 专辑="${albumTitle}", 厂牌="${label}", 发行日期="${releaseDate}"`, 'debug');

            // 参数验证
            if (!songTitle) {
                return {
                    success: false,
                    error: '歌曲标题不能为空'
                };
            }

            // 获取token
            const token = await this.getToken();
            if (!token) {
                return {
                    success: false,
                    error: '无法获取访问令牌'
                };
            }

            // 构建搜索请求
            const searchFields = {
                recordingArtistName: { value: '' }, // 不限制艺人
                recordingTitle: { value: songTitle },
                releaseName: { value: albumTitle || '' }
            };

            this._log(`发送API请求到: ${this.baseURL}/recordings`, 'debug');
            this._log(`请求数据: ${JSON.stringify({
                number: 10,
                start: 0,
                searchFields: searchFields,
                showReleases: true
            })}`, 'debug');
            this._log(`使用TOKEN: ${token.substring(0, 8)}...`, 'debug');

            const response = await axios.post(`${this.baseURL}/recordings`, {
                number: 50, // 大幅增加搜索数量，确保包含目标记录
                start: 0,
                searchFields: searchFields,
                showReleases: true // 获取完整发行信息
            }, {
                headers: {
                    'authorization': `Token ${token}`,
                    'content-type': 'application/json',
                    'origin': this.siteURL,
                    'referer': this.siteURL,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this._log(`API响应状态: ${response.status}`, 'debug');
            this._log(`API响应数据: ${JSON.stringify(response.data)}`, 'debug');

            if (response.data && response.data.recordings) {
                const recordings = response.data.recordings;
                this._log(`API返回 ${recordings.length} 条结果`, 'debug');

                // 直接匹配逻辑
                const matches = [];

                for (const record of recordings) {
                    const recordTitle = (record.recordingTitle || '').toLowerCase().trim();
                    const recordVersion = (record.recordingVersion || '').toLowerCase().trim();
                    const recordAlbum = (record.releaseName || '').toLowerCase().trim();
                    const recordLabel = (record.releaseLabel || '').toLowerCase().trim();
                    const recordDate = record.releaseDate || '';

                    const searchTitleLower = songTitle.toLowerCase().trim();
                    const searchAlbumLower = (albumTitle || '').toLowerCase().trim();
                    const searchLabelLower = (label || '').toLowerCase().trim();

                    this._log(`检查记录: "${record.recordingTitle}"${recordVersion ? ` (${record.recordingVersion})` : ''}`, 'debug');

                    // 歌曲名匹配 - 支持版本信息和宽松匹配
                    let titleMatches = false;

                    if (recordVersion) {
                        // 如果有版本信息，组合完整标题进行匹配
                        const fullRecordTitle = `${recordTitle} (${recordVersion})`;
                        titleMatches = fullRecordTitle === searchTitleLower;
                        this._log(`  歌曲匹配(含版本): "${searchTitleLower}" vs "${fullRecordTitle}" = ${titleMatches}`, 'debug');
                    } else {
                        // 没有版本信息，直接匹配
                        titleMatches = recordTitle === searchTitleLower;
                        this._log(`  歌曲匹配: "${searchTitleLower}" vs "${recordTitle}" = ${titleMatches}`, 'debug');
                    }

                    // 如果严格匹配失败，尝试宽松匹配（去掉空格和括号内容）
                    if (!titleMatches) {
                        const searchTitleClean = searchTitleLower.replace(/\s+/g, '').replace(/\([^)]*\)/g, '');
                        const recordTitleClean = recordTitle.replace(/\s+/g, '').replace(/\([^)]*\)/g, '');

                        titleMatches = searchTitleClean === recordTitleClean;
                        if (titleMatches) {
                            this._log(`  ✓ 歌曲宽松匹配: "${searchTitleLower}" ≈ "${recordTitle}"`, 'debug');
                        }
                    }

                    if (!titleMatches) {
                        this._log(`  跳过: 歌曲名不匹配`, 'debug');
                        continue;
                    }

                    // 专辑名匹配（如果提供）- 支持灵活匹配
                    if (searchAlbumLower && recordAlbum) {
                        // 完全匹配
                        if (recordAlbum === searchAlbumLower) {
                            this._log(`  专辑完全匹配: "${searchAlbumLower}" = "${recordAlbum}"`, 'debug');
                        }
                        // 包含匹配（处理版本信息的情况）
                        else if (searchAlbumLower.includes(recordAlbum) || recordAlbum.includes(searchAlbumLower)) {
                            this._log(`  专辑包含匹配: "${searchAlbumLower}" ≈ "${recordAlbum}"`, 'debug');
                        }
                        // 都不匹配，跳过
                        else {
                            this._log(`  跳过: 专辑名不匹配 "${searchAlbumLower}" vs "${recordAlbum}"`, 'debug');
                            continue;
                        }
                    }

                    // 厂牌匹配（如果提供）- 去掉所有空格进行匹配
                    if (searchLabelLower && recordLabel) {
                        const searchLabelNoSpaces = searchLabelLower.replace(/\s+/g, '');
                        const recordLabelNoSpaces = recordLabel.replace(/\s+/g, '');

                        if (searchLabelNoSpaces !== recordLabelNoSpaces) {
                            this._log(`  跳过: 厂牌不匹配 "${searchLabelLower}" vs "${recordLabel}"`, 'debug');
                            continue;
                        } else {
                            this._log(`  ✓ 厂牌匹配: "${recordLabel}"`, 'debug');
                        }
                    }

                    // 发行日期匹配（如果提供）
                    if (releaseDate && recordDate) {
                        const searchDateStr = this._formatDate(releaseDate);
                        const recordDateStr = recordDate;

                        if (searchDateStr && recordDateStr && searchDateStr !== recordDateStr) {
                            this._log(`  跳过: 发行日期不匹配 "${searchDateStr}" vs "${recordDateStr}"`, 'debug');
                            continue;
                        }
                    }

                    // 添加到匹配列表
                    matches.push(record);
                    this._log(`  ✓ 基础匹配通过，加入候选列表`, 'debug');
                }

                // 如果只有一个匹配，直接返回
                if (matches.length === 1) {
                    this._log(`找到唯一匹配记录: ISRC=${matches[0].isrc}`, 'debug');
                    return {
                        success: true,
                        results: [matches[0]]
                    };
                }

                // 如果有多个匹配，返回所有匹配供进一步筛选
                if (matches.length > 1) {
                    this._log(`找到 ${matches.length} 个匹配记录，需要进一步筛选`, 'debug');
                    return {
                        success: true,
                        results: matches,
                        needsArtistFilter: true // 标记需要艺人筛选
                    };
                }

                // 没有找到完全匹配的记录
                this._log('没有找到完全匹配的记录', 'debug');
                return {
                    success: true,
                    results: []
                };

            } else {
                return {
                    success: false,
                    error: 'API响应格式错误'
                };
            }

        } catch (error) {
            this._log(`搜索失败: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 格式化日期为YYYY-MM-DD格式
     * @param {string|Date} date - 输入日期
     * @returns {string} 格式化后的日期字符串
     */
    _formatDate(date) {
        try {
            if (!date) return '';

            let dateObj;
            if (date instanceof Date) {
                dateObj = date;
            } else {
                dateObj = new Date(date);
            }

            if (isNaN(dateObj.getTime())) {
                return '';
            }

            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (error) {
            this._log(`日期格式化失败: ${error.message}`, 'error');
            return '';
        }
    }

    /**
     * 通过ISRC查询UPC代码
     * @param {string} isrc - ISRC代码
     * @returns {Promise<Object>} 查询结果，包含UPC等信息
     */
    async searchUpcByIsrc(isrc) {
        try {
            this._log(`通过ISRC查询UPC: "${isrc}"`, 'debug');

            // 参数验证
            if (!isrc) {
                return {
                    success: false,
                    error: 'ISRC代码不能为空'
                };
            }

            // 获取token
            const token = await this.getToken();
            if (!token) {
                return {
                    success: false,
                    error: '无法获取访问令牌'
                };
            }

            // 构建请求数据
            const requestData = {
                searchFields: {
                    isrc: isrc
                },
                start: 0,
                number: 10,
                showReleases: true
            };

            this._log(`发送UPC查询请求: ${JSON.stringify(requestData)}`, 'debug');

            // 发送请求到SoundExchange API
            const response = await axios.post('https://isrc-api.soundexchange.com/api/ext/recordings', requestData, {
                headers: {
                    'authorization': `Token ${token}`,
                    'content-type': 'application/json',
                    'accept': 'application/json',
                    'origin': 'https://isrcsearch.ifpi.org',
                    'referer': 'https://isrcsearch.ifpi.org/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site'
                },
                timeout: 30000
            });

            if (response.data && response.data.recordings) {
                const recordings = response.data.recordings;
                this._log(`UPC查询返回 ${recordings.length} 条结果`, 'debug');

                if (recordings.length > 0) {
                    const record = recordings[0]; // 取第一个结果

                    this._log(`API返回记录详情: ${JSON.stringify(record, null, 2)}`, 'debug');

                    // 提取UPC信息
                    const upcInfo = {
                        isrc: record.isrc || isrc,
                        upc: record.icpn || null, // icpn字段包含UPC代码
                        recordingTitle: record.recordingTitle || '',
                        recordingArtistName: record.recordingArtistName || '',
                        recordingVersion: record.recordingVersion || null,
                        releaseName: record.releaseName || '',
                        releaseLabel: record.releaseLabel || '',
                        releaseDate: record.releaseDate || '',
                        recordingYear: record.recordingYear || '',
                        duration: record.duration || '',
                        genre: record.genre || [],
                        releaseArtistName: record.releaseArtistName || '',
                        recordingType: record.recordingType || '',
                        isValidIsrc: record.isValidIsrc || '',
                        isExplicit: record.isExplicit || null,
                        id: record.id || ''
                    };

                    this._log(`找到UPC信息: ISRC=${upcInfo.isrc}, UPC=${upcInfo.upc}, 标题=${upcInfo.recordingTitle}`, 'debug');

                    return {
                        success: true,
                        data: upcInfo,
                        totalResults: recordings.length
                    };
                } else {
                    this._log('未找到匹配的ISRC记录', 'debug');
                    return {
                        success: true,
                        data: null,
                        message: '未找到匹配的ISRC记录'
                    };
                }
            } else {
                return {
                    success: false,
                    error: 'API响应格式错误'
                };
            }

        } catch (error) {
            this._log(`UPC查询失败: ${error.message}`, 'error');

            // 处理特定的HTTP错误
            if (error.response) {
                const status = error.response.status;
                const statusText = error.response.statusText;

                if (status === 401) {
                    return {
                        success: false,
                        error: '认证失败，请检查访问令牌'
                    };
                } else if (status === 404) {
                    return {
                        success: true,
                        data: null,
                        message: '未找到匹配的ISRC记录'
                    };
                } else if (status === 429) {
                    return {
                        success: false,
                        error: '请求过于频繁，请稍后重试'
                    };
                } else {
                    return {
                        success: false,
                        error: `API请求失败: ${status} ${statusText}`
                    };
                }
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量查询UPC代码
     * @param {Array<string>} isrcList - ISRC代码数组
     * @param {number} delay - 请求间隔时间（毫秒），默认1000ms
     * @returns {Promise<Object>} 批量查询结果
     */
    async batchSearchUpc(isrcList, delay = 1000) {
        try {
            this._log(`开始批量UPC查询，共 ${isrcList.length} 个ISRC`, 'debug');

            const results = [];
            const errors = [];

            for (let i = 0; i < isrcList.length; i++) {
                const isrc = isrcList[i];
                this._log(`[${i + 1}/${isrcList.length}] 查询ISRC: ${isrc}`, 'debug');

                try {
                    const result = await this.searchUpcByIsrc(isrc);

                    if (result.success && result.data) {
                        results.push(result.data);
                        this._log(`✓ 成功: ${isrc} -> UPC: ${result.data.upc}`, 'debug');
                    } else {
                        this._log(`✗ 失败: ${isrc} - ${result.error || result.message}`, 'debug');
                        errors.push({
                            isrc: isrc,
                            error: result.error || result.message
                        });
                    }
                } catch (error) {
                    this._log(`✗ 异常: ${isrc} - ${error.message}`, 'error');
                    errors.push({
                        isrc: isrc,
                        error: error.message
                    });
                }

                // 添加延迟避免请求过于频繁（除了最后一个）
                if (i < isrcList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            this._log(`批量查询完成: 成功 ${results.length}，失败 ${errors.length}`, 'debug');

            return {
                success: true,
                results: results,
                errors: errors,
                summary: {
                    total: isrcList.length,
                    successful: results.length,
                    failed: errors.length
                }
            };

        } catch (error) {
            this._log(`批量UPC查询失败: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ISRCSearcher;








