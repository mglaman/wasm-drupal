class TrialManager extends HTMLElement {
    static observedAttributes = ['mode', 'message'];
    constructor() {
        super()
    }

    render() {
        const mode = this.getAttribute('mode');
        if (!mode) {
            this.replaceChildren(this.initializingEl())
        } else if (mode === 'new_session') {
            const progress = document.createElement('div')
            progress.classList.add('rounded-md', 'p-4', 'bg-white', 'w-96', 'text-center')
            progress.innerText = this.getAttribute('message')
            this.replaceChildren(progress)
        } else if (mode === 'existing_session') {
            this.replaceChildren(this.actionsEl())
        }
    }

    connectedCallback() {
        this.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'w-full', 'h-dvh')
        this.render()
    }

    disconnectedCallback() {
        console.log("Custom element removed from page.");
    }

    adoptedCallback() {
        console.log("Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.render()
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
            this.dispatchEvent(new CustomEvent('resume', {
                composed: true
            }))
        })

        const newButton = document.createElement('button');
        newButton.classList.add(...buttonClasses, 'rounded-r-md', 'hover:bg-drupal-rec')
        newButton.id = 'new'
        newButton.innerText = 'New session'
        newButton.addEventListener('click', () => {
            if (window.confirm("Your site's data will be completely removed, do you want to continue?")) {
                this.removeAttribute('mode');
                this.dispatchEvent(new CustomEvent('new', {
                    composed: true
                }))
            }
        })

        wrapper.appendChild(resumeButton)
        wrapper.appendChild(newButton)
        return wrapper
    }
}

customElements.get('trial-manager') || customElements.define('trial-manager', TrialManager)
