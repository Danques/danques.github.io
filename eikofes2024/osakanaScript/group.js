class Group {
    constructor() {
        this.group = new Set();
    }

    run() {
        for (let element of this.group) {
            if (element.run(this.group)) {
                this.delete(element);
            }
        }
    }

    add(element) {
        this.group.add(element);
    }

    delete(element) {
        this.group.delete(element);
    }
}