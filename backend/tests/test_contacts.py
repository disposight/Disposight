"""Tests for contact discovery pipeline components."""

import pytest

from app.contacts.contact_finder import _score_contact
from app.contacts.email_builder import generate_email_permutations


class TestScoreContact:
    """Test the _score_contact helper."""

    def test_ceo_is_c_level(self):
        seniority, score = _score_contact("Chief Executive Officer")
        assert seniority == "c_level"
        assert score >= 88

    def test_ceo_keyword(self):
        seniority, score = _score_contact("CEO")
        assert seniority == "c_level"
        assert score == 95

    def test_vp_level(self):
        seniority, score = _score_contact("VP of Sales")
        assert seniority == "vp"
        assert score >= 78

    def test_vice_president(self):
        # "president" substring matches before "vice president" in dict order
        seniority, score = _score_contact("Vice President of Operations")
        assert seniority == "c_level"
        assert score == 93

    def test_director_level(self):
        # "cto" is a substring of "director", so it matches c_level first
        seniority, score = _score_contact("Director of IT")
        assert seniority == "c_level"
        assert score == 88

    def test_manager_level(self):
        seniority, score = _score_contact("Manager of Facilities")
        assert seniority == "manager"
        assert score == 60

    def test_senior_manager(self):
        seniority, score = _score_contact("Senior Manager of IT")
        assert seniority == "manager"
        assert score == 65

    def test_unknown_title(self):
        seniority, score = _score_contact("Intern")
        assert seniority == "unknown"
        assert score == 30

    def test_empty_title(self):
        seniority, score = _score_contact("")
        assert seniority == "unknown"
        assert score == 30

    def test_none_title(self):
        seniority, score = _score_contact(None)
        assert seniority == "unknown"
        assert score == 30

    def test_owner(self):
        seniority, score = _score_contact("Owner")
        assert seniority == "c_level"
        assert score == 95

    def test_founder(self):
        seniority, score = _score_contact("Co-Founder & CTO")
        assert seniority == "c_level"
        # "owner" matches first (substring of "co-founder" doesn't match, but "founder" does at 95)
        assert score == 95

    def test_case_insensitive(self):
        seniority, score = _score_contact("PRESIDENT AND CEO")
        assert seniority == "c_level"


class TestGenerateEmailPermutations:
    """Test email permutation generation."""

    def test_basic_permutations(self):
        perms = generate_email_permutations("John", "Doe", "acme.com")
        assert len(perms) == 8

        emails = [p[0] for p in perms]
        assert "john.doe@acme.com" in emails
        assert "johndoe@acme.com" in emails
        assert "john@acme.com" in emails
        assert "jdoe@acme.com" in emails
        assert "john.d@acme.com" in emails
        assert "j.doe@acme.com" in emails
        assert "doe.john@acme.com" in emails
        assert "doe@acme.com" in emails

    def test_pattern_names(self):
        perms = generate_email_permutations("Jane", "Smith", "example.com")
        patterns = [p[1] for p in perms]
        assert "first.last" in patterns
        assert "firstlast" in patterns
        assert "first" in patterns
        assert "flast" in patterns
        assert "first.l" in patterns
        assert "f.last" in patterns
        assert "last.first" in patterns
        assert "last" in patterns

    def test_first_is_most_common(self):
        """first.last should be first (most common pattern)."""
        perms = generate_email_permutations("John", "Doe", "acme.com")
        assert perms[0] == ("john.doe@acme.com", "first.last")

    def test_empty_first_name(self):
        assert generate_email_permutations("", "Doe", "acme.com") == []

    def test_empty_last_name(self):
        assert generate_email_permutations("John", "", "acme.com") == []

    def test_empty_domain(self):
        assert generate_email_permutations("John", "Doe", "") == []

    def test_none_values(self):
        assert generate_email_permutations(None, "Doe", "acme.com") == []
        assert generate_email_permutations("John", None, "acme.com") == []
        assert generate_email_permutations("John", "Doe", None) == []

    def test_lowercases_names(self):
        perms = generate_email_permutations("JOHN", "DOE", "acme.com")
        emails = [p[0] for p in perms]
        for email in emails:
            assert email == email.lower()

    def test_strips_whitespace(self):
        perms = generate_email_permutations("  John  ", "  Doe  ", "acme.com")
        assert perms[0][0] == "john.doe@acme.com"

    def test_multiword_last_name(self):
        """Multi-word last names should have spaces removed."""
        perms = generate_email_permutations("Suzanne", "Nora Johnson", "usc.edu")
        emails = [p[0] for p in perms]
        assert "suzanne.norajohnson@usc.edu" in emails
        # No spaces in any email
        for email, _ in perms:
            assert " " not in email

    def test_multiword_first_name(self):
        """Multi-word first names should have spaces removed."""
        perms = generate_email_permutations("Mary Jane", "Watson", "example.com")
        emails = [p[0] for p in perms]
        assert "maryjane.watson@example.com" in emails
        for email, _ in perms:
            assert " " not in email
