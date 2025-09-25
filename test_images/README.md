# Тестовые изображения для OCR

## Рекомендуемые изображения для тестирования:

### 1. SSH Connection Details (ssh_details.png)
Содержимое:
```
SSH Connection Details
Host: ssh2.vast.ai
Port: 34170
User: root
Instance ID: 25954171
```

### 2. Server Configuration (server_config.png)
Содержимое:
```
Server Configuration
Public IP: 213.181.108.221
Machine Copy Port: 39999
Instance Port Range: 39166-39166
IP Address Type: Dynamic
```

### 3. Connection Command (connection_cmd.png)
Содержимое:
```
Connection Info
Proxy Command: ssh -p 34170 root@ssh2.vast.ai -L 8080:localhost:8080
Local IP Addresses: 192.168.1.100
```

## Инструкции по созданию:

1. Создайте изображения с четким текстом на контрастном фоне
2. Используйте шрифт размером не менее 12pt
3. Сохраните в форматах PNG или JPG
4. Размер файла не должен превышать 10MB

## Тестирование:

1. Загрузите 2-3 изображения в ImageServerParser
2. Проверьте drag-and-drop функциональность
3. Убедитесь, что прогресс-бар отображается корректно
4. Проверьте объединение результатов из разных изображений
5. Протестируйте обработку ошибок с поврежденными файлами
