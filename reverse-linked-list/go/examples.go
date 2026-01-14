package main

import (
	"fmt"
)

// Определение узла связанного списка
type ListNode struct {
	Val  int
	Next *ListNode
}

// Пример 1: Итеративный разворот связанного списка
//
// Задача: Развернуть связанный список итеративно
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseListIterative(head *ListNode) *ListNode {
	var prev *ListNode
	curr := head

	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev = curr
		curr = next
	}

	return prev
}

// Пример 2: Рекурсивный разворот связанного списка
//
// Задача: Развернуть связанный список рекурсивно
// Временная сложность: O(n)
// Пространственная сложность: O(n) из-за стека вызовов
func reverseListRecursive(head *ListNode) *ListNode {
	if head == nil || head.Next == nil {
		return head
	}

	// Рекурсивно разворачиваем остальную часть
	reversed := reverseListRecursive(head.Next)

	// Разворачиваем текущий узел
	head.Next.Next = head
	head.Next = nil

	return reversed
}

// Пример 3: Разворот части списка (от позиции left до right)
//
// Задача: Развернуть узлы списка от позиции left до right
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseBetween(head *ListNode, left, right int) *ListNode {
	if left == right {
		return head
	}

	dummy := &ListNode{Val: 0, Next: head}
	prev := dummy

	// Переходим к узлу перед left
	for i := 1; i < left; i++ {
		prev = prev.Next
	}

	// Разворачиваем часть списка
	curr := prev.Next
	var next *ListNode

	for i := 0; i <= right-left; i++ {
		temp := curr.Next
		curr.Next = next
		next = curr
		curr = temp
	}

	// Соединяем части
	prev.Next.Next = curr
	prev.Next = next

	return dummy.Next
}

// Пример 4: Разворот узлов группами по K
//
// Задача: Развернуть узлы списка группами по K элементов
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseKGroup(head *ListNode, k int) *ListNode {
	curr := head
	count := 0

	// Проверяем, достаточно ли узлов для группы
	for curr != nil && count < k {
		curr = curr.Next
		count++
	}

	// Если достаточно узлов, разворачиваем
	if count == k {
		// Рекурсивно обрабатываем остальную часть
		curr = reverseKGroup(curr, k)

		// Разворачиваем текущую группу
		for count > 0 {
			next := head.Next
			head.Next = curr
			curr = head
			head = next
			count--
		}

		head = curr
	}

	return head
}

// Пример 5: Обмен узлами парами
//
// Задача: Обменять каждые два соседних узла
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func swapPairs(head *ListNode) *ListNode {
	dummy := &ListNode{Val: 0, Next: head}
	prev := dummy

	for prev.Next != nil && prev.Next.Next != nil {
		first := prev.Next
		second := first.Next

		first.Next = second.Next
		second.Next = first
		prev.Next = second

		prev = first
	}

	return dummy.Next
}

// Пример 6: Разворот связанного списка (упрощенная версия)
//
// Задача: Развернуть весь список (базовая версия)
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseList(head *ListNode) *ListNode {
	return reverseListIterative(head)
}

// Вспомогательная функция для создания списка из массива
func createList(values []int) *ListNode {
	if len(values) == 0 {
		return nil
	}

	head := &ListNode{Val: values[0]}
	curr := head

	for i := 1; i < len(values); i++ {
		curr.Next = &ListNode{Val: values[i]}
		curr = curr.Next
	}

	return head
}

// Вспомогательная функция для вывода списка
func printList(head *ListNode) {
	curr := head
	for curr != nil {
		fmt.Printf("%d", curr.Val)
		if curr.Next != nil {
			fmt.Print(" -> ")
		}
		curr = curr.Next
	}
	fmt.Println()
}

// Примеры использования
func main() {
	// Пример 1: Итеративный разворот
	list1 := createList([]int{1, 2, 3, 4, 5})
	fmt.Print("Исходный список: ")
	printList(list1)
	reversed1 := reverseListIterative(list1)
	fmt.Print("Развернутый список: ")
	printList(reversed1)

	// Пример 2: Рекурсивный разворот
	list2 := createList([]int{1, 2, 3, 4})
	reversed2 := reverseListRecursive(list2)
	fmt.Print("Рекурсивно развернутый: ")
	printList(reversed2)

	// Пример 3: Разворот части списка
	list3 := createList([]int{1, 2, 3, 4, 5})
	reversed3 := reverseBetween(list3, 2, 4)
	fmt.Print("Разворот от 2 до 4: ")
	printList(reversed3)

	// Пример 4: Обмен парами
	list4 := createList([]int{1, 2, 3, 4})
	swapped := swapPairs(list4)
	fmt.Print("Обмен парами: ")
	printList(swapped)
}

