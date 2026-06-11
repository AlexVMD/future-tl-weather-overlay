<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

$visitor = $_GET['visitor'] ?? '';
if (!is_string($visitor) || !preg_match('/^[a-zA-Z0-9._:-]{12,96}$/', $visitor)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid visitor'], JSON_UNESCAPED_UNICODE);
    exit;
}

$dataDir = __DIR__ . '/.counter-data';
$dataFile = $dataDir . '/counter.json';
$maxStoredDays = 45;
$maxStoredVisitors = 50000;

if (!is_dir($dataDir) && !mkdir($dataDir, 0755, true) && !is_dir($dataDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'storage unavailable'], JSON_UNESCAPED_UNICODE);
    exit;
}

$handle = fopen($dataFile, 'c+');
if ($handle === false) {
    http_response_code(500);
    echo json_encode(['error' => 'storage unavailable'], JSON_UNESCAPED_UNICODE);
    exit;
}

flock($handle, LOCK_EX);

$raw = stream_get_contents($handle);
$data = $raw ? json_decode($raw, true) : null;

if (!is_array($data)) {
    $data = [
        'visitors' => [],
        'days' => [],
    ];
}

$today = (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))->format('Y-m-d');
$visitorHash = hash('sha256', $visitor);

if (!isset($data['visitors']) || !is_array($data['visitors'])) {
    $data['visitors'] = [];
}

if (!isset($data['days']) || !is_array($data['days'])) {
    $data['days'] = [];
}

$oldestDay = (new DateTimeImmutable($today, new DateTimeZone('Europe/Moscow')))
    ->modify(sprintf('-%d days', $maxStoredDays - 1))
    ->format('Y-m-d');

foreach (array_keys($data['days']) as $day) {
    if (!is_string($day) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $day) || $day < $oldestDay) {
        unset($data['days'][$day]);
    }
}

if (count($data['visitors']) > $maxStoredVisitors) {
    uasort($data['visitors'], static function ($a, $b): int {
        return strcmp((string)($b['firstSeen'] ?? ''), (string)($a['firstSeen'] ?? ''));
    });
    $data['visitors'] = array_slice($data['visitors'], 0, $maxStoredVisitors, true);
}

if (!isset($data['visitors'][$visitorHash])) {
    $data['visitors'][$visitorHash] = [
        'firstSeen' => $today,
    ];
}

if (!isset($data['days'][$today])) {
    $data['days'][$today] = [
        'visits' => 0,
        'unique' => [],
    ];
}

$data['days'][$today]['visits']++;
$data['days'][$today]['unique'][$visitorHash] = true;

$response = [
    'totalUnique' => count($data['visitors']),
    'todayVisits' => (int) $data['days'][$today]['visits'],
    'todayUnique' => count($data['days'][$today]['unique']),
    'date' => $today,
];

rewind($handle);
ftruncate($handle, 0);
fwrite($handle, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

echo json_encode($response, JSON_UNESCAPED_UNICODE);
