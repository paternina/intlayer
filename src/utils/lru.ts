interface ListNode<K, V> {
  key: K;
  value: V;
  prev: ListNode<K, V> | null;
  next: ListNode<K, V> | null;
}

export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, ListNode<K, V>>;
  private head: ListNode<K, V> | null = null;
  private tail: ListNode<K, V> | null = null;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (node) {
      this.moveToTail(node);
      return node.value;
    }

    return undefined;
  }

  set(key: K, value: V): void {
    const existing = this.cache.get(key);

    if (existing) {
      existing.value = value;
      this.moveToTail(existing);
      return;
    }

    const node: ListNode<K, V> = {
      key,
      value,
      prev: this.tail,
      next: null
    };

    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;

    if (!this.head) {
      this.head = node;
    }

    this.cache.set(key, node);

    if (this.cache.size > this.maxSize) {
      if (this.head) {
        this.cache.delete(this.head.key);
        this.detachHead();
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  size(): number {
    return this.cache.size;
  }

  private moveToTail(node: ListNode<K, V>): void {
    if (node === this.tail) {
      return;
    }

    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    }

    node.prev = this.tail;
    node.next = null;

    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;

    if (!this.head) {
      this.head = node;
    }
  }

  private detachHead(): void {
    if (!this.head) {
      return;
    }

    const next = this.head.next;
    this.head.next = null;
    this.head = next;

    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }
  }
}
