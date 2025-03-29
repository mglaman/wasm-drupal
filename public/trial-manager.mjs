import {getBroadcastChannel} from "./utils.mjs";

export default class TrialManager extends HTMLElement {
    static observedAttributes = ['mode', 'message'];
    constructor() {
        super()
        this.worker = new Worker('/install-worker.mjs', {
            type: "module"
        });
        this.worker.onmessage = this.onMessage.bind(this)

        this.channel = getBroadcastChannel()
        this.channel.addEventListener('message', ({ data }) => {
            const { action } = data;
            if (action === 'service_worker_ready') {
                this.sendWorkerAction('check_existing', {
                    flavor: this.flavor
                })
            }
        })

        this.spinner = this.initializingEl()
        this.actions = this.actionsEl()
        this.progress = this.progressEl()
    }

    render() {
        const mode = this.mode;
        if (!mode) {
            this.replaceChildren(this.spinner)
        } else if (mode === 'new_session') {
            this.replaceChildren(this.progress)
        } else if (mode === 'existing_session') {
            this.replaceChildren(this.actions)
        }
    }

    get mode() {
        return this.getAttribute('mode')
    }

    set mode(mode) {
        this.setAttribute('mode', mode)
    }

    get flavor() {
        return this.getAttribute('flavor') || 'drupal'
    }

    set flavor(flavor) {
        this.setAttribute('flavor', flavor)
    }

    get artifact() {
        // Allow manually overriding the artifact used.
        if (this.hasAttribute('artifact')) {
            return this.getAttribute('artifact')
        }

        const artifactName = this._isMobile() ? 'trial-installed.zip' : 'trial.zip';
        return `https://git.drupalcode.org/api/v4/projects/157093/jobs/artifacts/0.x/raw/${artifactName}?job=build+trial+artifact`
    }

    set artifact(artifact) {
        this.setAttribute('artifact', artifact)
    }

    get message() {
        return this.getAttribute('message') || '';
    }

    set message(message) {
        this.setAttribute('message', message)
    }

    get installType() {
        if (!this.hasAttribute('install-type')) {
            return !this._isMobile() ? 'interactive' : 'preinstalled'
        }
        return this.getAttribute('install-type')
    }

    get siteName() {
        if (!this.hasAttribute('site-name')) {
            return 'Try'
        }
        return this.getAttribute('site-name')
    }

    connectedCallback() {
        this.render()
    }

    disconnectedCallback() {
        this.worker.terminate();
    }

    sendWorkerAction(action, params) {
        this.worker.postMessage({action, params})
    }

    onMessage({ data }) {
        const { action, message, type } = data;

        if (type === 'error') {
            this.worker.postMessage({ action: 'stop' })
        }

        if (type === 'set_cookie') {
            this.channel.postMessage({
                action: 'set_cookie',
                params: data.params
            })
        }

        if (action === 'started') {
            this.setAttribute('mode', 'new_session');
            this.setAttribute('message', 'Starting')
        }
        else if (action === 'status') {
            this.setAttribute('message', message)
        }
        else if (action === 'finished') {
            this.setAttribute('message', 'Refreshing data')
            this.channel.postMessage({
                action: 'refresh'
            })

            this.setAttribute('message', 'Redirecting to your site')
            window.location = `/cgi/${this.flavor}`
        }
        else if (action === 'reload') {
            this.channel.postMessage({
                action: 'refresh'
            })
            window.location.reload();
        }
        else if (action === 'export_finished') {
            this.setAttribute('message', message)
            const link = document.createElement('a');
            link.href = URL.createObjectURL(data.params.export);
            link.download = 'drupal.zip'
            link.click();
            URL.revokeObjectURL(link.href);
            this.setAttribute('mode', 'existing_session');
        }
        else if (action === 'check_existing_finished') {
            if (data.params.exists) {
                this.setAttribute('mode', 'existing_session');
            } else {
                this.worker.postMessage({
                    action: 'start',
                    params: {
                        flavor: this.flavor,
                        artifact: this.artifact,
                        installParameters: {
                            // @see install-site.phpcode
                            installType: this.installType,
                            siteName: this.siteName,
                            langcode: 'en',
                        }
                    }
                })
            }
        }
        else {
            console.log(data)
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'mode') {
            this.render()
            this.setAttribute('message', '')
        }
        else if (name === 'message') {
            this.progress.innerText = newValue
        }
    }

    initializingEl() {
        const el = document.createElement('div');
        el.classList.add('flex', 'justify-center')
        el.innerHTML = `<svg class="animate-spin h-16 w-16 text-drupal-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>`
        return el;
    }
    actionsEl() {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.classList.add('isolate', 'inline-flex', 'space-x-2');

        const buttonClasses = [
          'bg-white',
          'relative',
          'inline-flex',
          'items-center',
          'px-4',
          'py-1',
          'font-semibold',
          'text-drupal-darkBlue',
          'border-2',
          'border-drupal-darkBlue',
          'rounded-md',
          'hover:border-drupal-blue',
          'hover:text-drupal-blue'
        ];
        const resumeButton = document.createElement('button');
        resumeButton.classList.add(...buttonClasses)
        resumeButton.id = 'resume';
        resumeButton.innerText = 'Resume'
        resumeButton.addEventListener('click', () => {
            this.sendWorkerAction('start', {
                flavor: this.flavor,
                artifact: this.artifact
            })
        })

        const newButton = document.createElement('button');
        newButton.classList.add(...buttonClasses)
        newButton.id = 'new'
        newButton.innerText = 'New'
        newButton.addEventListener('click', () => {
            if (window.confirm("Your site's data will be completely removed, do you want to continue?")) {
                this.removeAttribute('mode');
                this.sendWorkerAction('remove', {
                    flavor: this.flavor
                })
            }
        })

        const exportButton = document.createElement('button')
        exportButton.classList.add(...buttonClasses, 'group')
        exportButton.id = 'export'
        exportButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-drupal-darkBlue group-hover:text-drupal-blue fill-current" viewBox="0 0 256 256"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"></path></svg>
<span class="pl-1.5">Download</span>
`
        exportButton.addEventListener('click', () => {
            this.removeAttribute('mode');
            this.sendWorkerAction('export', {
                flavor: this.flavor
            })
        })

        buttonWrapper.appendChild(resumeButton)
        buttonWrapper.appendChild(newButton)
        buttonWrapper.appendChild(exportButton)

        const container = document.createElement('div');
        container.classList.add('text-center')
        const message = document.createElement('p');
        message.classList.add('mb-4', 'text-lg')
        message.innerText = 'You already have a site, what would you like to do?'
        container.appendChild(message)
        container.appendChild(buttonWrapper)

        return container
    }

    progressEl() {
        const progress = document.createElement('div')
        progress.classList.add('rounded-md', 'p-4', 'bg-white', 'w-96', 'text-center', 'w-full')
        progress.innerText = this.message
        return progress
    }

    _isMobile() {
        return (navigator.maxTouchPoints || 'ontouchstart' in document.documentElement)
    }
}

export function defineTrialManagerElement() {
    customElements.get('trial-manager') || customElements.define('trial-manager', TrialManager)
}
