export function getBroadcastChannel() {
    return new BroadcastChannel('drupal-cgi-worker');
}
