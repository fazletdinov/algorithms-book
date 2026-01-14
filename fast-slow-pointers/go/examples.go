package main

import (
	"fmt"
)

// Определение узла связанного списка
type ListNode struct {
	Val  int
	Next *ListNode
}

// Пример 1: Обнаружение цикла в связанном списке
//
// Задача: Определить, содержит ли связанный список цикл
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func hasCycle(head *ListNode) bool {
	if head == nil || head.Next == nil {
		return false
	}

	slow := head
	fast := head

	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next

		// Если указатели встретились, есть цикл
		if slow == fast {
			return true
		}
	}

	return false
}

// Пример 2: Поиск начала цикла в связанном списке
//
// Задача: Найти узел, где начинается цикл
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func detectCycle(head *ListNode) *ListNode {
	if head == nil || head.Next == nil {
		return nil
	}

	slow := head
	fast := head

	// Шаг 1: Обнаружить цикл
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next

		if slow == fast {
			break
		}
	}

	// Если цикла нет
	if fast == nil || fast.Next == nil {
		return nil
	}

	// Шаг 2: Найти начало цикла
	// Возвращаем slow в начало и двигаем оба указателя по одному шагу
	slow = head
	for slow != fast {
		slow = slow.Next
		fast = fast.Next
	}

	return slow
}

// Пример 3: Поиск середины связанного списка
//
// Задача: Найти средний узел связанного списка
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func middleNode(head *ListNode) *ListNode {
	slow := head
	fast := head

	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
	}

	return slow
}

// Пример 4: Удаление N-го узла с конца списка
//
// Задача: Удалить N-й узел с конца списка
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func removeNthFromEnd(head *ListNode, n int) *ListNode {
	// Создаем фиктивный узел для упрощения удаления головы
	dummy := &ListNode{Val: 0, Next: head}
	slow := dummy
	fast := dummy

	// Двигаем fast на n+1 шагов вперед
	for i := 0; i <= n; i++ {
		fast = fast.Next
	}

	// Двигаем оба указателя до конца
	for fast != nil {
		slow = slow.Next
		fast = fast.Next
	}

	// Удаляем узел
	slow.Next = slow.Next.Next

	return dummy.Next
}

// Пример 5: Проверка, является ли список палиндромом
//
// Задача: Определить, является ли связанный список палиндромом
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func isPalindrome(head *ListNode) bool {
	if head == nil || head.Next == nil {
		return true
	}

	// Находим середину списка
	slow := head
	fast := head

	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
	}

	// Разворачиваем вторую половину списка
	var prev *ListNode
	curr := slow

	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev = curr
		curr = next
	}

	// Сравниваем первую и вторую половины
	first := head
	second := prev

	for second != nil {
		if first.Val != second.Val {
			return false
		}
		first = first.Next
		second = second.Next
	}

	return true
}

// Пример 6: Поиск дубликата числа (Floyd's Cycle Detection для массива)
//
// Задача: Найти дубликат числа в массиве, где числа от 1 до n, и есть один дубликат
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func findDuplicate(nums []int) int {
	// Используем алгоритм Floyd для обнаружения цикла
	// Массив можно рассматривать как связанный список, где nums[i] указывает на nums[nums[i]]
	slow := nums[0]
	fast := nums[0]

	// Обнаруживаем цикл
	for {
		slow = nums[slow]
		fast = nums[nums[fast]]
		if slow == fast {
			break
		}
	}

	// Находим начало цикла (дубликат)
	slow = nums[0]
	for slow != fast {
		slow = nums[slow]
		fast = nums[fast]
	}

	return slow
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

// Примеры использования
func main() {
	// Пример 1: Проверка цикла
	list1 := createList([]int{1, 2, 3})
	fmt.Printf("Список имеет цикл: %v\n", hasCycle(list1))

	// Пример 2: Поиск середины
	list2 := createList([]int{1, 2, 3, 4, 5})
	middle := middleNode(list2)
	fmt.Printf("Средний узел: %d\n", middle.Val)

	// Пример 3: Удаление N-го узла с конца
	list3 := createList([]int{1, 2, 3, 4, 5})
	list3 = removeNthFromEnd(list3, 2)
	fmt.Printf("После удаления 2-го с конца: ")
	for curr := list3; curr != nil; curr = curr.Next {
		fmt.Printf("%d ", curr.Val)
	}
	fmt.Println()

	// Пример 4: Проверка палиндрома
	list4 := createList([]int{1, 2, 2, 1})
	fmt.Printf("Список является палиндромом: %v\n", isPalindrome(list4))

	// Пример 5: Поиск дубликата
	nums := []int{1, 3, 4, 2, 2}
	fmt.Printf("Дубликат в массиве: %d\n", findDuplicate(nums))
}

