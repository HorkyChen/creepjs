import { captureError } from '../errors'
import { hashMini } from '../utils/crypto'
import { createTimer, queueEvent, logTestResult, performanceLogger, hashSlice } from '../utils/helpers'
import { HTMLNote, modal } from '../utils/html'

type SignalMap = Record<string, boolean>

interface NavigatorDetection {
	tampered: boolean
	properties: string[]
	inspected: number
}

interface UserAgentDetection {
	detected: boolean
	value: string
}

interface BotDetectionResult {
	detected: boolean
	signalCount: number
	totalSignals: number
	webdriver: SignalMap
	cdp: SignalMap
	navigator: NavigatorDetection
	userAgent: UserAgentDetection
}

type ChromeLike = {
	toString?: () => string
	loadTimes?: () => unknown
	csi?: () => unknown
	runtime?: {
		connect?: (options: { name: string }) => unknown
	}
}

type BotFingerprint = BotDetectionResult & { $hash: string }

const WINDOW_MARKERS = [
	'__selenium_evaluate', '__selenium_unwrapped', '_selenium',
	'_Selenium_IDE_Recorder', '__fxdriver_evaluate', '__driver_evaluate',
	'__webdriver_evaluate', '__driver_unwrapped', '__nw_top_frame',
	'callSelenium', '$chrome_asyncScriptInfo', '$cdc_asdjflasutopfhv_',
	'__nw_initWindow', '__nw_onDestory', '__nw_removeEventListeners',
	'fmget_target', 'callPhantom_evaluate', 'selenium-evaluate-response',
	'webdriver-evaluate-response', '__driver_script_func',
]

const DOCUMENT_MARKERS = [
	'__fxdriver_evaluate', '__selenium_evaluate', '__driver_evaluate',
	'__webdriver_evaluate', '__driver_unwrapped', '__webdriver_script_func',
	'__driver_script_func', 'callPhantom', 'callSelenium',
]

const HEADLESS_WINDOW_PROPS = [
	'webdriver', '__webdriver_evaluate', '__selenium_evaluate',
	'__fxdriver_evaluate', '__driver_evaluate', '__webdriver_script_func',
	'__driver_script_func', '__webdriver_script_fn', '__driver_unwrapped',
	'__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped',
	'_Selenium_IDE_Recorder', '__lastWatiningId', '_WEBDRIVER_ELEM_CACHE',
	'__utils__', '__nw_windows', 'callPhantom', '_phantom', '__phantomas',
	'nightmare', '__nightmare', 'awesomium', 'CefSharp', 'fmget_target',
	'Sequentum', 'geb', 'spawn', 'Buffer',
	'BrowserAutomationStudio_GetFrameIndex',
	'BrowserAutomationStudio_GetInternal',
	'BrowserAutomationStudio_GetGeolocation',
	'BrowserAutomationStudio_RestoreDate',
	'browser_automation_studio_find_result',
	'browser_automation_studio_result',
	'browser_automation_studio_object_result',
	'wdioElectron',
]

const HEADLESS_DOCUMENT_PROPS = [
	'__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
	'__driver_evaluate', '__driver_unwrapped', '__webdriver_script_func',
	'__webdriver_script_fn', '__driver_script_func', '$cdc_asdjflasutopfhv_',
	'$chrome_asyncScriptInfo', 'callSelenium', '__$webdriverAsyncExecutor',
	'callPhantom', '__selenium_unwrapped', '__fxdriver_unwrapped',
	'webdriverCallback', 'webdriver-evaluate-response',
]

const BOT_PATTERNS = [
	/bot/i, /crawl/i, /spider/i, /slurp/i, /search/i,
	/headlesschrome/i, /phantomjs/i, /selenium/i, /webdriver/i,
	/python/i, /wget/i, /curl/i, /axios/i, /postman/i,
	/java(?!;)/i, /library/i, /archive/i, /monitor/i,
	/scan/i, /scrape/i, /preview/i, /proxy/i, /feed/i,
	/download/i, /check/i, /http/i, /capture/i,
	/^mozilla\/\d\.\d\s*$/i, /^mozilla\/\d\.\d\s+\w+$/i,
	/^$/,
]

const WEBDRIVER_LABELS: Record<string, string> = {
	webdriver: 'navigator.webdriver',
	webdriverAdvance: 'WebDriver advanced markers',
	selenium: 'SlimerJS / Triflejs',
	nightmare: 'NightmareJS',
	phantomjs: 'PhantomJS',
	awesomium: 'Awesomium',
	cef: 'CEF (Chromium Embedded Framework)',
	cefSharp: 'CoachJS (emit)',
	coachJS: 'FMiner marker',
	fMiner: 'Sequentum marker',
	geb: 'Geb / Watir',
	phantomas: 'Phantomas (Buffer)',
	rhino: 'Rhino / Node (spawn)',
	webdriverIO: 'WebDriverIO / BrowserAutomationStudio',
	headlessChrome: 'Headless Chrome aggregate',
}

const CDP_LABELS: Record<string, string> = {
	cdp: 'CDP chrome object anomaly',
	devtoolsWorker: 'DevTools worker debugger delay/timeout',
	devtoolsConsole: 'DevTools console.debug stack getter',
}

const getWindowScope = () => window as unknown as Record<string, unknown>
const getDocumentScope = () => document as unknown as Record<string, unknown>

const hasMarker = (scope: Record<string, unknown>, key: string) => key in scope

function detectWebdriver() {
	return !!navigator.webdriver
}

function detectWebdriverAdvance() {
	const windowScope = getWindowScope()

	for (const key in windowScope) {
		if (/^([a-z]){3}_.*_(Array|Promise|Symbol|Proxy|JSON|Object)$/.test(key)) {
			return true
		}
	}

	for (const marker of WINDOW_MARKERS) {
		if (hasMarker(windowScope, marker)) {
			return true
		}
	}

	const documentScope = getDocumentScope()
	for (const marker of DOCUMENT_MARKERS) {
		if (hasMarker(documentScope, marker)) {
			return true
		}
	}

	const element = document.documentElement
	return (
		element.getAttribute('webdriver') !== null ||
		element.getAttribute('__selenium_evaluate') !== null ||
		element.getAttribute('__webdriver_script_fn') !== null
	)
}

function detectSelenium() {
	const windowScope = getWindowScope()
	return hasMarker(windowScope, 'slimerjs') || hasMarker(windowScope, 'triflejs')
}

function detectNightmareJS() {
	const windowScope = getWindowScope()
	return [
		hasMarker(windowScope, '__nightmare'),
		hasMarker(windowScope, 'nightmare'),
		/PhantomJS/.test(navigator.userAgent),
	].some(Boolean)
}

function detectPhantomJS() {
	const windowScope = getWindowScope()
	return hasMarker(windowScope, 'callPhantom') || hasMarker(windowScope, '_phantom') || hasMarker(windowScope, '__phantomas')
}

function detectAwesomium() {
	const windowScope = getWindowScope()
	return hasMarker(windowScope, 'awesomium') || hasMarker(windowScope, 'RunPerfTest')
}

function detectCEF() {
	return hasMarker(getWindowScope(), 'CefSharp')
}

function detectCEFSharp() {
	return hasMarker(getWindowScope(), 'emit')
}

function detectCoachJS() {
	return hasMarker(getWindowScope(), 'fmget_target')
}

function detectFMiner() {
	return hasMarker(getWindowScope(), 'Sequentum')
}

function detectGeb() {
	const windowScope = getWindowScope()
	return hasMarker(windowScope, 'geb') || hasMarker(windowScope, 'WatiN')
}

function detectPhantomas() {
	return hasMarker(getWindowScope(), 'Buffer')
}

function detectRhino() {
	return hasMarker(getWindowScope(), 'spawn')
}

function detectWebdriverIO() {
	const windowScope = getWindowScope()
	if (hasMarker(windowScope, 'domAutomation') || hasMarker(windowScope, 'domAutomationController')) {
		return true
	}
	for (const key in windowScope) {
		if (key.startsWith('BrowserAutomationStudio')) {
			return true
		}
	}
	return false
}

function detectHeadlessChrome() {
	const windowScope = getWindowScope()
	for (const key of HEADLESS_WINDOW_PROPS) {
		if (windowScope[key]) {
			return true
		}
	}

	const documentScope = getDocumentScope()
	for (const key of HEADLESS_DOCUMENT_PROPS) {
		if (documentScope[key]) {
			return true
		}
	}

	for (const key in documentScope) {
		const value = documentScope[key]
		if (/^\$[a-z]dc_/.test(key) && value && typeof value === 'object' && 'toString' in value) {
			return true
		}
	}

	try {
		// @ts-expect-error intentional invalid access for stack inspection
		null[0]()
	} catch (error) {
		const stack = `${(error as Error).stack || ''}`.toLowerCase()
		const keywords = ['phantomjs', 'webdriver', 'selenium', 'casperjs', 'triflejs', 'specterjs']
		if (keywords.some((keyword) => stack.includes(keyword))) {
			return true
		}
	}

	return false
}

function detectCDP() {
	try {
		const chrome = (window as Window & typeof globalThis & { chrome?: ChromeLike }).chrome
		if (!chrome) {
			return false
		}
		const chromeString = typeof chrome.toString === 'function' ? chrome.toString() : ''
		if (chromeString.includes('native')) {
			const nativeChrome = chrome.loadTimes || chrome.csi
			if (nativeChrome) {
				const fnString = Function.prototype.toString.call(nativeChrome)
				if (!fnString.includes('[native code]')) {
					return true
				}
			}
		}
		if (chrome.runtime && chrome.runtime.connect) {
			try {
				chrome.runtime.connect({ name: '__bot_detect_probe__' })
			} catch (error) {
				return false
			}
		}
		return false
	} catch (error) {
		return false
	}
}

function detectDevToolsByConsole() {
	let accessed = false
	try {
		const error = new window.Error()
		Object.defineProperty(error, 'stack', {
			configurable: false,
			enumerable: false,
			get() {
				accessed = true
				return ''
			},
		})
		window.console.debug(error)
	} catch (error) {
		return accessed
	}
	return accessed
}

function detectDevTools() {
	return new Promise<boolean>((resolve) => {
		const workerCode = `
			onmessage = function() {
				postMessage('before');
				debugger;
				postMessage('after');
			};
		`
		try {
			const blob = new Blob([workerCode], { type: 'application/javascript' })
			const url = URL.createObjectURL(blob)
			const worker = new Worker(url)
			let startTime = 0
			let resolved = false

			worker.onmessage = ({ data }) => {
				if (data === 'before') {
					startTime = performance.now()
					setTimeout(() => {
						if (resolved) {
							return
						}
						resolved = true
						worker.terminate()
						URL.revokeObjectURL(url)
						resolve(true)
					}, 500)
					return
				}
				if (data === 'after' && !resolved) {
					resolved = true
					const diff = performance.now() - startTime
					worker.terminate()
					URL.revokeObjectURL(url)
					resolve(diff > 100)
				}
			}

			worker.onerror = () => {
				if (resolved) {
					return
				}
				resolved = true
				worker.terminate()
				URL.revokeObjectURL(url)
				resolve(false)
			}

			worker.postMessage('')
		} catch (error) {
			resolve(false)
		}
	})
}

function detectNavigatorTampered(): NavigatorDetection {
	const descriptors = new Map<string, PropertyDescriptor>()
	let current: object | null = navigator

	while (current) {
		Object.getOwnPropertyNames(current).forEach((property) => {
			if (property === 'hasOwnProperty' || descriptors.has(property)) {
				return
			}
			const descriptor = Object.getOwnPropertyDescriptor(current, property)
			if (descriptor) {
				descriptors.set(property, descriptor)
			}
		})
		current = Object.getPrototypeOf(current)
	}

	const properties: string[] = []
	descriptors.forEach((descriptor, property) => {
		try {
			const fn = descriptor.get || descriptor.value
			if (typeof fn !== 'function') {
				return
			}
			const fnString = Function.prototype.toString.call(fn)
			if (!fnString.includes('[native code]')) {
				properties.push(property)
			}
		} catch (error) {
			return
		}
	})

	return {
		tampered: properties.length > 0,
		properties,
		inspected: descriptors.size,
	}
}

function detectBotUA(userAgent: string) {
	if (!userAgent) {
		return true
	}
	return BOT_PATTERNS.some((pattern) => pattern.test(userAgent))
}

const countSignals = (signals: SignalMap) => Object.keys(signals).filter((key) => signals[key]).length

const formatSignalModal = (title: string, labels: Record<string, string>, signals: SignalMap) => {
	return modal(
		`creep-${title.toLowerCase().replace(/\s+/g, '-')}`,
		`<strong>${title}</strong><br><br>${Object.keys(labels).map((key) => `${labels[key]}: ${signals[key]}`).join('<br>')}`,
		hashMini(signals),
	)
}

export default async function getBotFeatures(): Promise<BotDetectionResult | undefined> {
	try {
		const timer = createTimer()
		await queueEvent(timer)

		const webdriver = {
			webdriver: detectWebdriver(),
			webdriverAdvance: detectWebdriverAdvance(),
			selenium: detectSelenium(),
			nightmare: detectNightmareJS(),
			phantomjs: detectPhantomJS(),
			awesomium: detectAwesomium(),
			cef: detectCEF(),
			cefSharp: detectCEFSharp(),
			coachJS: detectCoachJS(),
			fMiner: detectFMiner(),
			geb: detectGeb(),
			phantomas: detectPhantomas(),
			rhino: detectRhino(),
			webdriverIO: detectWebdriverIO(),
			headlessChrome: detectHeadlessChrome(),
		}

		await queueEvent(timer)
		const devtoolsWorker = await detectDevTools()

		await queueEvent(timer)
		const cdp = {
			cdp: detectCDP(),
			devtoolsWorker,
			devtoolsConsole: detectDevToolsByConsole(),
		}

		await queueEvent(timer)
		const navigatorResult = detectNavigatorTampered()

		const userAgentValue = navigator.userAgent
		const userAgent = {
			detected: detectBotUA(userAgentValue),
			value: userAgentValue,
		}

		const signalCount = (
			countSignals(webdriver) +
			countSignals(cdp) +
			(navigatorResult.tampered ? 1 : 0) +
			(userAgent.detected ? 1 : 0)
		)
		const totalSignals = Object.keys(webdriver).length + Object.keys(cdp).length + 2

		logTestResult({ time: timer.stop(), test: 'bot', passed: true })
		return {
			detected: signalCount > 0,
			signalCount,
			totalSignals,
			webdriver,
			cdp,
			navigator: navigatorResult,
			userAgent,
		}
	} catch (error) {
		logTestResult({ test: 'bot', passed: false })
		captureError(error)
		return
	}
}

export function botFeaturesHTML(fp: { bot?: BotFingerprint }) {
	if (!fp.bot) {
		return `
		<div class="col-six undefined">
			<strong>Bot Detection</strong> <span>${HTMLNote.BLOCKED}</span>
			<div>signals: ${HTMLNote.BLOCKED}</div>
			<div>webdriver: ${HTMLNote.BLOCKED}</div>
			<div>cdp/devtools: ${HTMLNote.BLOCKED}</div>
			<div>navigator: ${HTMLNote.BLOCKED}</div>
			<div>user agent:</div>
			<div class="block-text">${HTMLNote.BLOCKED}</div>
		</div>`
	}

	const {
		bot: {
			$hash,
			detected,
			signalCount,
			totalSignals,
			webdriver,
			cdp,
			navigator,
			userAgent,
		},
	} = fp

	const webdriverDetected = countSignals(webdriver)
	const cdpDetected = countSignals(cdp)
	const rating = Math.round((signalCount / totalSignals) * 100)
	const navigatorLink = navigator.tampered ? modal(
		'creep-bot-navigator',
		`<strong>Navigator Tampering</strong><br><br>inspected: ${navigator.inspected}<br>tampered: ${navigator.properties.join('<br>')}`,
		hashMini(navigator.properties),
	) : 'native'

	return `
	<div class="relative col-six">
		<style>
			.bot-rating {
				background: linear-gradient(90deg, var(${detected ? '--error' : '--grey-glass'}) ${rating}%, #fff0 ${rating}%, #fff0 100%);
			}
		</style>
		<span class="aside-note">${performanceLogger.getLog().bot}</span>
		<strong>Bot Detection</strong><span class="${detected ? 'bold-fail ' : ''}hash">${hashSlice($hash)}</span>
		<div class="bot-rating">${detected ? 'detected' : 'clear'}: ${signalCount}/${totalSignals}</div>
		<div>webdriver (${Object.keys(webdriver).length}): ${formatSignalModal('Bot Webdriver', WEBDRIVER_LABELS, webdriver)} ${webdriverDetected}</div>
		<div>cdp/devtools (${Object.keys(cdp).length}): ${formatSignalModal('Bot CDP', CDP_LABELS, cdp)} ${cdpDetected}</div>
		<div>navigator: ${navigator.tampered ? navigator.properties.length : 0}/${navigator.inspected} ${navigatorLink}</div>
		<div>user agent: ${userAgent.detected ? '<span class="bold-fail">matched</span>' : 'clear'}</div>
		<div class="block-text">${userAgent.detected ? `<span class="bold-fail">${userAgent.value}</span>` : userAgent.value}</div>
	</div>`
}