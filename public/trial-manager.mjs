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
            if (action === 'service_worker_activated') {
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
        return this.getAttribute('flavor')
    }

    set flavor(flavor) {
        this.setAttribute('flavor', flavor || '')
    }

    get artifact() {
        return this.getAttribute('artifact')
    }

    set artifact(artifact) {
        this.setAttribute('artifact', artifact)
    }

    get recipes() {
        if (this.hasAttribute('recipes')) {
            return this.getAttribute('recipes').split(',').map(i => i.trim())
        }
        return [];
    }

    get message() {
        return this.getAttribute('message') || '';
    }

    set message(message) {
        this.setAttribute('message', message)
    }

    connectedCallback() {
        this.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'w-full', 'h-dvh')
        this.render()
        this.sendWorkerAction('check_existing', {
            flavor: this.flavor
        })
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

        if (action === 'started') {
            this.setAttribute('mode', 'new_session');
            this.setAttribute('message', 'Starting runtime')
        }
        else if (action === 'status') {
            this.setAttribute('message', message)
        }
        else if (action === 'finished') {
            this.setAttribute('message', 'Refreshing runtime')
            this.channel.postMessage({
                action: 'refresh'
            })

            this.setAttribute('message', 'Redirecting to session')
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
                            skip: this.getAttribute('skip-install') || false,
                            siteName: this.getAttribute('site-name') || 'Try Drupal',
                            profile: this.getAttribute('profile') || 'standard',
                            recipes: this.recipes,
                            langcode: this.getAttribute('langcode') || 'en',
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
        el.innerHTML = `<svg class="animate-spin h-16 w-16 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>`
        return el;
    }
    actionsEl() {
        const wrapper = document.createElement('div');
        wrapper.classList.add('isolate', 'inline-flex', 'rounded-md', 'shadow-sm');

        const buttonClasses = ['bg-white', 'relative', 'inline-flex', 'items-center', 'px-3', 'py-2', 'text-sm', 'font-semibold', 'text-gray-900'];
        const resumeButton = document.createElement('button');
        resumeButton.classList.add(...buttonClasses, 'rounded-l-md', 'hover:bg-gray-100')
        resumeButton.id = 'resume';
        resumeButton.innerText = 'Resume session'
        resumeButton.addEventListener('click', () => {
            this.sendWorkerAction('start', {
                flavor: this.flavor,
                artifact: this.artifact
            })
        })

        const newButton = document.createElement('button');
        newButton.classList.add(...buttonClasses, 'hover:bg-drupal-rec')
        newButton.id = 'new'
        newButton.innerText = 'New session'
        newButton.addEventListener('click', () => {
            if (window.confirm("Your site's data will be completely removed, do you want to continue?")) {
                this.removeAttribute('mode');
                this.sendWorkerAction('remove', {
                    flavor: this.flavor
                })
            }
        })

        const exportButton = document.createElement('button')
        exportButton.classList.add(...buttonClasses, 'rounded-r-md')
        exportButton.id = 'export'
        exportButton.innerText = 'Export'
        exportButton.addEventListener('click', () => {
            this.removeAttribute('mode');
            this.sendWorkerAction('export', {
                flavor: this.flavor
            })
        })

        wrapper.appendChild(resumeButton)
        wrapper.appendChild(newButton)
        wrapper.appendChild(exportButton)
        return wrapper
    }

    progressEl() {
        const progress = document.createElement('div')
        progress.classList.add('rounded-md', 'p-4', 'bg-white', 'w-96', 'text-center')
        progress.innerText = this.message
        return progress
    }
}

export function defineTrialManagerElement() {
    customElements.get('trial-manager') || customElements.define('trial-manager', TrialManager)
}
