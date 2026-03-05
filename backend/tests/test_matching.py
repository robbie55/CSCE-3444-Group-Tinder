from app.core.matching import (
    compute_match_score,
    get_suggestions,
    jaccard,
    normalize_set,
)

# --- normalize_set ---


def test_normalize_set_lowercases_and_strips():
    assert normalize_set(["  Python ", "JAVA", " c++ "]) == {"python", "java", "c++"}


def test_normalize_set_empty():
    assert normalize_set([]) == set()


# --- jaccard ---


def test_jaccard_identical():
    assert jaccard({"a", "b"}, {"a", "b"}) == 1.0


def test_jaccard_no_overlap():
    assert jaccard({"a"}, {"b"}) == 0.0


def test_jaccard_partial_overlap():
    assert jaccard({"a", "b", "c"}, {"b", "c", "d"}) == 0.5


def test_jaccard_both_empty():
    assert jaccard(set(), set()) == 0.0


def test_jaccard_one_empty():
    assert jaccard({"a"}, set()) == 0.0


# --- compute_match_score ---


def test_score_identical_skills_same_major():
    a = {"skills": ["Python", "Java"], "major": "Computer Science"}
    b = {"skills": ["Python", "Java"], "major": "Computer Science"}
    assert compute_match_score(a, b) == 1.0


def test_score_identical_skills_different_major():
    a = {"skills": ["Python"], "major": "Computer Science"}
    b = {"skills": ["Python"], "major": "Data Science"}
    assert compute_match_score(a, b) == 0.9


def test_score_no_overlap_same_major():
    a = {"skills": ["Python"], "major": "Computer Science"}
    b = {"skills": ["Rust"], "major": "Computer Science"}
    assert compute_match_score(a, b) == 0.1


def test_score_no_overlap_different_major():
    a = {"skills": ["Python"], "major": "Computer Science"}
    b = {"skills": ["Rust"], "major": "Data Science"}
    assert compute_match_score(a, b) == 0.0


def test_score_both_empty_skills_same_major():
    a = {"skills": [], "major": "Computer Science"}
    b = {"skills": [], "major": "Computer Science"}
    assert compute_match_score(a, b) == 0.1


def test_score_both_empty_skills_different_major():
    a = {"skills": [], "major": "Computer Science"}
    b = {"skills": [], "major": "Data Science"}
    assert compute_match_score(a, b) == 0.0


def test_score_case_insensitive():
    a = {"skills": ["python", "JAVA"], "major": "CS"}
    b = {"skills": ["Python", "java"], "major": "CS"}
    assert compute_match_score(a, b) == 1.0


# --- get_suggestions ---


def test_get_suggestions_returns_sorted():
    me = {"skills": ["Python", "Java"], "major": "CS"}
    candidates = [
        {"skills": ["Rust"], "major": "EE", "name": "no_match"},
        {"skills": ["Python", "Java"], "major": "CS", "name": "best"},
        {"skills": ["Python"], "major": "CS", "name": "mid"},
    ]
    results = get_suggestions(me, candidates)
    names = [r[0]["name"] for r in results]
    assert names == ["best", "mid", "no_match"]


def test_get_suggestions_respects_limit():
    me = {"skills": ["Python"], "major": "CS"}
    candidates = [{"skills": ["Python"], "major": "CS"} for _ in range(20)]
    results = get_suggestions(me, candidates, limit=5)
    assert len(results) == 5


def test_get_suggestions_empty_candidates():
    me = {"skills": ["Python"], "major": "CS"}
    assert get_suggestions(me, []) == []
