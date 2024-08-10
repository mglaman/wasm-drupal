function installWorkerAction(worker, action, params) {
    worker.postMessage({action, params})
}

export function attachTrialManager(el, worker, flavor, artifact) {
    el.addEventListener('resume', () => {
        installWorkerAction(worker, 'start', {flavor, artifact})
    })
    el.addEventListener('new', () => {
        installWorkerAction(worker, 'remove', {flavor})
    })
    el.addEventListener('export', () => {
        installWorkerAction(worker, 'export', {flavor})
    })
    installWorkerAction(worker, 'check_existing', {flavor})
}

export function createInstallWorker(flavor, artifact, sendMessage) {
    const worker = new Worker('/install-worker.mjs', {
        type: "module"
    });
    worker.onmessage = async ({ data }) => {
        const { action, message, type } = data;

        if (type === 'error') {
            worker.postMessage({ action: 'stop' })
        }

        if (action === 'started') {
            document.querySelector('trial-manager').setAttribute('mode', 'new_session');
            document.querySelector('trial-manager').setAttribute('message', 'Starting runtime')
        }
        else if (action === 'status') {
            document.querySelector('trial-manager').setAttribute('message', message)
        }
        else if (action === 'finished') {
            document.querySelector('trial-manager').setAttribute('message', 'Refreshing runtime')
            console.log('Refreshing PHP')
            await sendMessage('refresh', []);

            document.querySelector('trial-manager').setAttribute('message', 'Redirecting to session')
            console.log('Redirecting');
            window.location = `/cgi/${flavor}`
        }
        else if (action === 'reload') {
            console.log('Refreshing PHP')
            await sendMessage('refresh', []);
            window.location.reload();
        }
        else if (action === 'export_finished') {
            document.querySelector('trial-manager').setAttribute('message', message)
            const link = document.createElement('a');
            link.href = URL.createObjectURL(data.params.export);
            link.download = 'drupal.zip'
            link.click();
            URL.revokeObjectURL(link.href);
            document.querySelector('trial-manager').setAttribute('mode', 'existing_session');
        }
        else if (action === 'check_existing_finished') {
            if (data.params.exists) {
                document.querySelector('trial-manager').setAttribute('mode', 'existing_session');
            } else {
                worker.postMessage({
                    action: 'start',
                    params: {
                        flavor,
                        artifact,
                        installParameters: {
                            siteName: 'Try Drupal Core',
                            profile: 'standard',
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
    return worker
}
