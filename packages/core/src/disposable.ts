/**
 * Objects that need to clean up after themselves.
 */
export class Disposable {
    /**
     * Indicate if the object has already been disposed.
     */
    protected disposed: boolean = false;

    /**
     * Clean up.
     */
    dispose() {
        if (!this.disposed) {
            this.disposed = true;
            this.disposeInternal();
        }
    }

    /**
     * Extension point for disposable objects.
     */
    protected disposeInternal() { }
}

export default Disposable;
